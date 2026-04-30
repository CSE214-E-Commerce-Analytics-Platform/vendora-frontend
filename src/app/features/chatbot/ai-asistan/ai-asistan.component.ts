import { Component, inject, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiAgentService } from '../../../core/services/ai-agent.service';
import { AuthService } from '../../../core/services/auth.service';

type GuardrailType = 'INJECTION' | 'SCOPE' | 'ACCESS' | 'SECURITY';

interface BarItem { label: string; value: number; unit: string; pct: number; }

interface ChatMessage {
    role: 'user' | 'ai' | 'guardrail';
    content: string;
    guardrailType?: GuardrailType;
    guardrailTrigger?: string;
    guardrailRequestedStore?: string;
    guardrailSuggestion?: string;
    sqlQuery?: string | null;
    barTitle?: string;
    barItems?: BarItem[];
    rowCount?: number;
    queryTimeMs?: number;
    timestamp: Date;
}

@Component({
    selector: 'app-ai-asistan',
    standalone: true,
    imports: [CommonModule, FormsModule, DecimalPipe],
    templateUrl: './ai-asistan.component.html',
    styleUrl: './ai-asistan.component.css'
})
export class AiAsistanComponent implements OnInit {
    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    private aiService = inject(AiAgentService);
    private authService = inject(AuthService);

    userInput = '';
    isTyping = false;
    userRole = '';
    storeId: number | null = null;
    displayName = '';
    messages: ChatMessage[] = [];
    exampleQuestions: string[] = [];

    ngOnInit(): void {
        this.userRole = this.authService.getRole() || 'INDIVIDUAL';
        this.storeId = this.getStoreId();
        const email = this.authService.getCurrentUserEmail() || '';
        this.displayName = email.split('@')[0] || 'Kullanıcı';
        this.setExampleQuestions();
    }

    private getStoreId(): number | null {
        const token = this.authService.getAccessToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.storeId ?? payload.store_id ?? null;
        } catch { return null; }
    }

    private setExampleQuestions(): void {
        if (this.userRole === 'CORPORATE') {
            this.exampleQuestions = [
                'Geçen aya göre satışlar nasıl değişti?',
                "Stoku 10'un altına düşen ürünler?",
                'En değerli 5 müşterim kimler?',
                'Bekleyen siparişlerin toplam değeri nedir?',
                'Hangi kategoride iade oranı en yüksek?',
                'Bu hafta yapılan sevkiyatların durumu?',
                '1 yıldız alan ürünleri listele',
                'Aylık gelir trendini grafik olarak göster'
            ];
        } else if (this.userRole === 'INDIVIDUAL') {
            this.exampleQuestions = [
                'Bu ay ne kadar harcadım?',
                'Son 3 ayın sipariş özeti',
                'En çok hangi kategoriden alışveriş yaptım?',
                'Bekleyen siparişlerim var mı?',
                'İade ettiğim ürünler',
                'Aylık harcama trendimi grafik olarak göster'
            ];
        } else {
            this.exampleQuestions = [
                'Toplam kullanıcı sayısı nedir?',
                'Bu ay en çok satan ürünler',
                'Aktif mağaza sayısı',
                'Bugünkü toplam sipariş',
                'Aylık gelir özeti'
            ];
        }
    }

    get hasMessages(): boolean { return this.messages.length > 0; }

    get headerSubtitle(): string {
        if (this.hasMessages) {
            const storeInfo = this.storeId ? `store_id: #${this.storeId} · ` : '';
            return `Aktif oturum · ${storeInfo}Guardrail: Açık`;
        }
        return 'Mağaza verinizi doğal dilde sorgulayın — SQL bilmenize gerek yok';
    }

    useExample(q: string): void {
        this.userInput = q;
        this.sendMessage();
    }

    sendMessage(): void {
        const query = this.userInput.trim();
        if (!query || this.isTyping) return;

        this.messages.push({ role: 'user', content: query, timestamp: new Date() });
        this.userInput = '';
        this.isTyping = true;
        this.scrollToBottom();

        const startTime = Date.now();

        this.aiService.askQuestion(query, this.userRole).subscribe({
            next: (response) => {
                const queryTimeMs = Date.now() - startTime;
                this.messages.push(this.buildMessage(response.answer, response.sqlQuery ?? null, query, queryTimeMs));
                this.isTyping = false;
                this.scrollToBottom();
            },
            error: () => {
                this.messages.push({
                    role: 'ai',
                    content: 'Bir hata oluştu. Lütfen tekrar deneyin.',
                    timestamp: new Date()
                });
                this.isTyping = false;
                this.scrollToBottom();
            }
        });
    }

    private buildMessage(answer: string, sqlQuery: string | null, userQuestion: string, queryTimeMs: number): ChatMessage {
        const ts = new Date();
        const gr = this.detectGuardrail(answer, userQuestion);
        if (gr) return { ...gr, sqlQuery, timestamp: ts } as ChatMessage;

        const barItems = this.parseBarItems(answer);
        const hasChart = barItems.length >= 2;

        return {
            role: 'ai',
            content: answer,
            sqlQuery,
            barTitle: hasChart ? this.extractBarTitle(answer) : undefined,
            barItems: hasChart ? barItems : undefined,
            rowCount: hasChart ? barItems.length : undefined,
            queryTimeMs,
            timestamp: ts
        };
    }

    private detectGuardrail(answer: string, userQuestion: string): Partial<ChatMessage> | null {
        if (answer.includes('[SECURITY] This request has been blocked') || answer.includes('[SECURITY] SQL Agent: Malicious')) {
            return {
                role: 'guardrail',
                guardrailType: 'INJECTION',
                content: answer,
                guardrailTrigger: this.extractInjectionTrigger(userQuestion)
            };
        }
        if (answer.includes('[AUTHORIZATION ERROR]')) {
            const storeMatch = userQuestion.match(/store[#\s]*(\d+)/i)
                || userQuestion.match(/#(\d+)/)
                || userQuestion.match(/mağaza[#\s]*(\d+)/i);
            if (storeMatch) {
                return { role: 'guardrail', guardrailType: 'ACCESS', content: answer, guardrailRequestedStore: storeMatch[1] };
            }
            return {
                role: 'guardrail',
                guardrailType: 'SCOPE',
                content: answer,
                guardrailTrigger: this.extractScopeTrigger(userQuestion),
                guardrailSuggestion: this.storeId
                    ? `Mağazanız (#${this.storeId}) için dönemsel karşılaştırma yapabilirim — örn. bu ay vs geçen ay.`
                    : 'Kendi verileriniz için dönemsel karşılaştırma yapabilirim.'
            };
        }
        return null;
    }

    private extractInjectionTrigger(q: string): string {
        const pats = [
            /ignore\s+(?:previous|your|all)\s+instructions?/i,
            /you\s+are\s+now/i,
            /act\s+as/i,
            /DAN\s+mode/i,
            /jailbreak/i,
            /DROP\s+TABLE/i,
            /DELETE\s+FROM/i
        ];
        for (const p of pats) {
            const m = q.match(p);
            if (m) return `"${m[0]}"`;
        }
        return `"${q.substring(0, 45)}..."`;
    }

    private extractScopeTrigger(q: string): string {
        const pats = [
            /filtre(?:sini)?\s+kaldır/i,
            /store_id\s+filtre/i,
            /tüm\s+mağaza/i,
            /all\s+stores?/i,
            /without.*filter/i
        ];
        for (const p of pats) {
            const m = q.match(p);
            if (m) return `"${m[0]}"`;
        }
        return `"${q.substring(0, 45)}"`;
    }

    private parseBarItems(text: string): BarItem[] {
        const re = /^(?:\d+\.\s+)?(.+?)[:：]\s*([\d,.]+)\s*(ad\.|adet|units?|₺|TL|%|kg)?/;
        const items: BarItem[] = [];
        for (const line of text.split('\n')) {
            const m = line.trim().match(re);
            if (m) {
                const value = parseFloat(m[2].replace(',', ''));
                if (!isNaN(value) && value > 0) {
                    items.push({ label: m[1].trim(), value, unit: m[3]?.trim() || '', pct: 0 });
                }
            }
        }
        if (items.length >= 2) {
            const max = Math.max(...items.map(i => i.value));
            return items.map(i => ({ ...i, pct: Math.round((i.value / max) * 100) }));
        }
        return [];
    }

    private extractBarTitle(text: string): string {
        for (const line of text.split('\n')) {
            const t = line.trim();
            if (!t) continue;
            if (t.match(/^(?:\d+\.\s|[-•]\s)/)) break;
            if (!t.match(/:\s*[\d,]+\s*(?:ad\.|adet|units?)?$/)) return t;
        }
        return '';
    }

    formatAiContent(content: string): string {
        return this.aiService.formatMarkdown(content);
    }

    formatQueryTime(ms: number): string {
        return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
    }

    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
            const ta = event.target as HTMLTextAreaElement;
            if (ta) ta.style.height = 'auto';
        }
    }

    autoResize(event: Event): void {
        const ta = event.target as HTMLTextAreaElement;
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
    }

    private scrollToBottom(): void {
        setTimeout(() => {
            if (this.messagesContainer) {
                const el = this.messagesContainer.nativeElement;
                el.scrollTop = el.scrollHeight;
            }
        }, 50);
    }
}
