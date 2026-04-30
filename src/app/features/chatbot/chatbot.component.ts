import { Component, inject, ElementRef, ViewChild, HostListener, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiAgentService, AiResponse } from '../../core/services/ai-agent.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatHistoryService, ChatHistoryItem } from '../../core/services/chat-history.service';
import { ChatHistorySidebarComponent } from './chat-history-sidebar/chat-history-sidebar.component';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type GuardrailType = 'INJECTION' | 'SCOPE' | 'ACCESS' | 'SECURITY' | 'SQL_INJECTION' | 'RATE_LIMIT' | 'WRITE_ATTEMPT' | 'EXFILTRATION' | 'CONTEXT_POISON';

interface GuardrailDetail {
    detectionType:  string;   // e.g. "Prompt Injection"
    trigger:        string;   // the suspicious phrase
    target:         string;   // what the attacker was trying to reach
    action:         string;   // what the system did
    blockedSql?:    string;   // the SQL that would have run (crossed out)
    suggestion?:    string;   // alternative action offered to the user
    badge?:         string;   // bottom badge label
}

interface BarItem { label: string; value: number; unit: string; pct: number; }

interface ChatMessage {
    role: 'user' | 'ai' | 'guardrail';
    content: string;
    // AI fields
    sqlQuery?:     string | null;
    chartUrl?:     string | null;   // extracted chart image URL
    barTitle?:     string;
    barItems?:     BarItem[];
    rowCount?:     number;
    queryTimeMs?:  number;
    trace?:        string[];
    suggestions?:  string[];
    // Guardrail fields
    guardrailType?:    GuardrailType;
    guardrailDetail?:  GuardrailDetail;
    timestamp: Date;
}

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule, DecimalPipe, ChatHistorySidebarComponent],
    templateUrl: './chatbot.component.html',
    styleUrl: './chatbot.component.css'
})
export class ChatbotComponent implements OnInit {
    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    private aiService      = inject(AiAgentService);
    private authService    = inject(AuthService);
    private historyService = inject(ChatHistoryService);

    isOpen       = false;
    isSidebarOpen = false;
    userInput    = '';
    isTyping     = false;
    userRole     = '';
    storeId: number | null = null;
    displayName  = '';
    messages: ChatMessage[] = [];
    exampleQuestions: string[] = [];

    isGraphExpanded  = false;
    expandedGraphSrc = '';

    // ── Export state ────────────────────────────────────────────────────────────────
    exportOpenIdx: number | null = null;
    exportToast: string | null = null;
    private exportToastTimer: ReturnType<typeof setTimeout> | null = null;

    // ── Admin live stream status ───────────────────────────────────────────────
    streamStep: { icon: string; label: string } | null = null;
    private streamInterval: ReturnType<typeof setInterval> | null = null;

    private readonly STREAM_STEPS = [
        { icon: '🛡', label: 'GuardrailsAgent running...' },
        { icon: '✍️', label: 'Writing SQL query...' },
        { icon: '🗄', label: 'Executing database query...' },
        { icon: '📊', label: 'AnalysisAgent processing...' },
        { icon: '📈', label: 'Building visualization...' },
    ];

    private startStreamingStatus(): void {
        if (this.userRole !== 'ADMIN') return;
        let i = 0;
        this.streamStep = this.STREAM_STEPS[0];
        this.streamInterval = setInterval(() => {
            i = (i + 1) % this.STREAM_STEPS.length;
            this.streamStep = this.STREAM_STEPS[i];
        }, 1500);
    }

    private stopStreamingStatus(): void {
        if (this.streamInterval) {
            clearInterval(this.streamInterval);
            this.streamInterval = null;
        }
        this.streamStep = null;
    }

    ngOnInit(): void {
        this.userRole    = this.authService.getRole() || 'INDIVIDUAL';
        this.storeId     = this.getStoreId();
        const email      = this.authService.getCurrentUserEmail() || '';
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
                'How many total orders does my store have?',
                'What is my store\'s total revenue?',
                'How many pending orders do I have?',
                'How many delivered orders do I have?',
                'How many cancelled orders do I have?',
                'My 5 highest value orders',
                'Total number of products in my store',
                'My products with less than 10 units in stock',
                'My 5 most expensive products',
                'Product count by category in my store',
                'Average product rating in my store',
                'My products that received positive reviews'
            ];
        } else if (this.userRole === 'INDIVIDUAL') {
            this.exampleQuestions = [
                'How many orders have I placed in total?',
                'What is the total amount I have spent?',
                'Do I have any pending orders?',
                'My delivered orders',
                'My most expensive order',
                'My cancelled orders',
                'My 5 most recent orders',
                'How many products have I reviewed?',
                'What is my average review rating?',
                'How many positive reviews have I left?'
            ];
        } else {
            this.exampleQuestions = [
                'Total number of registered users',
                'How many users are registered per role?',
                'How many active stores are on the platform?',
                'Which store has the most products?',
                'Total number of orders on the platform',
                'Order distribution by status',
                'Top 10 highest value orders',
                'Products with less than 10 units in stock',
                'Top 5 categories with the most products',
                'What are the 10 most expensive products?',
                'Average star rating across all reviews',
                'Review sentiment breakdown',
                'Shipment distribution by shipping mode',
                'Shipment count by warehouse',
                'Top 5 stores ranked by order count'
            ];
        }
    }

    get hasMessages(): boolean { return this.messages.length > 0; }

    get headerSubtitle(): string {
        if (this.hasMessages) {
            const storeInfo = this.storeId ? `store_id: #${this.storeId} · ` : '';
            return `Active session · ${storeInfo}Guardrail: Active`;
        }
        const storeInfo = this.storeId ? `— store_id: #${this.storeId}` : '';
        return `Custom to your store data ${storeInfo}`;
    }

    @HostListener('document:click')
    onDocumentClick(): void { this.exportOpenIdx = null; }

    toggleChat(): void { this.isOpen = !this.isOpen; }
    closeChat():  void { this.isOpen = false; }

    // ── Export helpers ───────────────────────────────────────────────────────

    private showToast(msg: string): void {
        this.exportToast = msg;
        if (this.exportToastTimer) clearTimeout(this.exportToastTimer);
        this.exportToastTimer = setTimeout(() => { this.exportToast = null; }, 3000);
    }

    toggleExportMenu(idx: number): void {
        this.exportOpenIdx = this.exportOpenIdx === idx ? null : idx;
    }

    private buildRows(msg: ChatMessage): Record<string, unknown>[] {
        if (msg.barItems?.length) {
            return msg.barItems.map(b => ({ Label: b.label, Value: b.value, Unit: b.unit }));
        }
        // Plain text — put it in a single cell
        const text = msg.content?.replace(/<[^>]+>/g, '') ?? '';
        return [{ 'Analysis Result': text }];
    }

    /** Returns bar chart rows if available, otherwise null (no data to export) */
    private chartRows(msg: ChatMessage): Record<string, unknown>[] | null {
        if (msg.barItems?.length) {
            return msg.barItems.map(b => ({ Label: b.label, Value: b.value, Unit: b.unit }));
        }
        return null; // no structured chart data
    }

    exportExcel(msg: ChatMessage, idx: number): void {
        this.exportOpenIdx = null;
        const rows = this.chartRows(msg);
        if (!rows) { this.showToast('❌ No chart data to export.'); return; }
        this.showToast('⏳ Preparing Excel...');
        setTimeout(() => {
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Chart Data');
            XLSX.writeFile(wb, `chart_data_${idx + 1}.xlsx`);
            this.showToast('✅ Excel downloaded!');
        }, 200);
    }

    exportCsv(msg: ChatMessage, idx: number): void {
        this.exportOpenIdx = null;
        const rows = this.chartRows(msg);
        if (!rows) { this.showToast('❌ No chart data to export.'); return; }
        this.showToast('⏳ Preparing CSV...');
        setTimeout(() => {
            const ws = XLSX.utils.json_to_sheet(rows);
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `chart_data_${idx + 1}.csv`; a.click();
            URL.revokeObjectURL(url);
            this.showToast('✅ CSV downloaded!');
        }, 200);
    }

    exportPdf(msg: ChatMessage, idx: number): void {
        this.exportOpenIdx = null;
        this.showToast('⏳ Capturing chart...');

        // If QuickChart URL exists, fetch it and embed it
        if (msg.chartUrl) {
            fetch(msg.chartUrl)
                .then(r => r.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const imgData = reader.result as string;
                        this.buildChartPdf(imgData, idx);
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(() => this.captureChartElementToPdf(idx));
            return;
        }
        // Fallback: screenshot bar chart element
        this.captureChartElementToPdf(idx);
    }

    private captureChartElementToPdf(idx: number): void {
        const card = document.getElementById(`ai-card-${idx}`);
        const chartEl = card?.querySelector('.chat-img-wrapper img, canvas, .bar-list') as HTMLElement | null;
        if (!chartEl) { this.showToast('❌ No chart to capture.'); return; }
        html2canvas(chartEl, { scale: 2, useCORS: true, backgroundColor: null }).then((canvas: HTMLCanvasElement) => {
            this.buildChartPdf(canvas.toDataURL('image/png'), idx);
        });
    }

    private buildChartPdf(imgData: string, idx: number): void {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        pdf.setFillColor(15, 15, 30);
        pdf.rect(0, 0, pageW, pageH, 'F');
        // Centre the chart image
        const maxW = pageW - 20;
        const maxH = pageH - 20;
        pdf.addImage(imgData, 'PNG', 10, 10, maxW, maxH, undefined, 'FAST');
        pdf.save(`chart_${idx + 1}.pdf`);
        this.showToast('✅ PDF downloaded!');
    }


    useExample(q: string): void {
        this.userInput = q;
        this.sendMessage();
    }

    clearChat(): void {
        this.messages = [];
        this.userInput = '';
    }

    // ── Chat History Sidebar ──────────────────────────────────────────────
    private currentHistoryId: number | null = null;

    toggleSidebar(): void { this.isSidebarOpen = !this.isSidebarOpen; }
    closeSidebar(): void  { this.isSidebarOpen = false; }

    onHistorySelected(item: ChatHistoryItem): void {
        this.isSidebarOpen = false;
        this.currentHistoryId = item.id;

        const stored = localStorage.getItem(`chat_msgs_${item.id}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                this.messages = parsed.map((m: ChatMessage) => ({ ...m, timestamp: new Date(m.timestamp) }));
                this.userInput = '';
                this.scrollToBottom();
                return;
            } catch { /* fall through to fallback */ }
        }

        // Fallback for old entries without stored messages
        this.messages = [];
        this.messages.push({
            role: 'user',
            content: item.initialQuery,
            timestamp: item.createdAt ? new Date(item.createdAt) : new Date()
        });
        this.messages.push({
            role: 'ai',
            content: `📂 No saved response found for this session. Click Send to re-run this query.`,
            timestamp: new Date()
        });
        this.userInput = item.initialQuery;
        this.scrollToBottom();
    }

    onNewChatFromSidebar(): void {
        this.isSidebarOpen = false;
        this.currentHistoryId = null;
        this.clearChat();
    }

    private saveToHistory(query: string): void {
        if (this.currentHistoryId) return;

        const title = query.length > 50 ? query.substring(0, 47) + '...' : query;
        this.historyService.create(title, query).subscribe({
            next: (item) => { this.currentHistoryId = item.id; }
        });
    }

    private saveMessagesToStorage(): void {
        if (!this.currentHistoryId) return;
        localStorage.setItem(`chat_msgs_${this.currentHistoryId}`, JSON.stringify(this.messages));
    }

    sendMessage(): void {
        const query = this.userInput.trim();
        if (!query || this.isTyping) return;

        this.messages.push({ role: 'user', content: query, timestamp: new Date() });
        this.userInput = '';
        this.isTyping  = true;
        this.startStreamingStatus();
        this.scrollToBottom();
        this.saveToHistory(query);

        const startTime = Date.now();

        this.aiService.askQuestion(query, this.userRole).subscribe({
            next: (res: AiResponse) => {
                const queryTimeMs = Date.now() - startTime;
                this.stopStreamingStatus();
                this.messages.push(this.buildMessage(res, query, queryTimeMs));
                this.isTyping = false;
                this.saveMessagesToStorage();
                this.scrollToBottom();
            },
            error: (err) => {
                // HTTP 429 — rate limit block
                if (err?.status === 429) {
                    this.messages.push({
                        role: 'guardrail',
                        content: '',
                        guardrailType: 'RATE_LIMIT',
                        guardrailDetail: {
                            detectionType: 'Object Enumeration (AV-09)',
                            trigger: `"${query.substring(0, 40)}"`,
                            target: 'ID-based data scraping',
                            action: 'Account blocked for 10 minutes',
                            badge: 'Security event logged · Rate Limit active'
                        },
                        timestamp: new Date()
                    });
                } else {
                    this.messages.push({
                        role: 'ai',
                        content: 'An error occurred. Please try again.',
                        timestamp: new Date()
                    });
                }
                this.isTyping = false;
                this.scrollToBottom();
            }
        });
    }

    // ── Map server response → ChatMessage ──────────────────────────────────────

    private buildMessage(res: AiResponse, userQuestion: string, queryTimeMs: number): ChatMessage {
        const ts     = new Date();
        const answer = res.answer;

        // ── Detect guardrail blocks from answer text ──────────────────────────
        const gr = this.detectGuardrail(answer, userQuestion, res);
        if (gr) return { ...gr, timestamp: ts, trace: res.trace } as ChatMessage;

        // ── Normal AI response ────────────────────────────────────────────────
        const hasChartImage = answer.includes('![');
        const barItems      = hasChartImage ? [] : this.parseBarItems(answer);
        const hasChart      = barItems.length >= 2;

        // Extract chart image URL from markdown: ![...](url)
        const imgMatch  = answer.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
        const chartUrl  = imgMatch ? imgMatch[1] : null;

        return {
            role:      'ai',
            content:   answer,
            sqlQuery:  res.sqlQuery,
            chartUrl:  chartUrl,
            barTitle:  hasChart ? this.extractBarTitle(answer)  : undefined,
            barItems:  hasChart ? barItems                       : undefined,
            rowCount:  hasChart ? barItems.length                : undefined,
            queryTimeMs,
            trace:     res.trace,
            suggestions: res.suggestions,
            timestamp: ts
        };
    }

    // ── Guardrail detection — maps response text to rich UI card ─────────────

    private detectGuardrail(answer: string, q: string, res: AiResponse): Partial<ChatMessage> | null {
        const lower  = answer.toLowerCase();
        const qLower = q.toLowerCase();
        const isAdmin = this.userRole === 'ADMIN';

        // ── AV-01 / AV-10: Prompt Injection / Context Poisoning ──────────────
        if (this.isUnsafeBlock(lower) && this.hasInjectionTokens(qLower)) {
            return {
                role: 'guardrail',
                content: answer,
                guardrailType: 'INJECTION',
                guardrailDetail: {
                    detectionType: 'Prompt Injection (AV-01)',
                    trigger:       this.extractInjectionTrigger(q),
                    target:        'store_id / role constraint bypass',
                    action:        'Request entirely rejected',
                    blockedSql:    `SELECT * FROM orders -- WHERE store_id=? removed (blocked)`,
                    badge:         'Security event logged'
                }
            };
        }

        // ── AV-03: SQL Injection ─────────────────────────────────────────────
        if (this.isUnsafeBlock(lower) && this.hasSqlInjectionTokens(qLower)) {
            return {
                role: 'guardrail',
                content: answer,
                guardrailType: 'SQL_INJECTION',
                guardrailDetail: {
                    detectionType: 'SQL Injection (AV-03)',
                    trigger:       this.extractSqlTrigger(q),
                    target:        'Database integrity',
                    action:        'SQL generation stopped',
                    blockedSql:    `${q.substring(0, 60)} -- BLOCKED`,
                    badge:         'Security event logged · Blocked by db_executor'
                }
            };
        }

        // ── AV-11: Write / Mass Assignment ───────────────────────────────────
        if (this.isUnsafeBlock(lower) && (this.hasWriteTokens(qLower) || lower.includes("read-only analytics") || lower.includes("salt okunur"))) {
            return {
                role: 'guardrail',
                content: answer,
                guardrailType: 'WRITE_ATTEMPT',
                guardrailDetail: {
                    detectionType: 'Write Attempt / Mass Assignment (AV-11)',
                    trigger:       this.extractWriteTrigger(q),
                    target:        'Database record modification',
                    action:        'SELECT-only policy active, write rejected',
                    blockedSql:    `UPDATE / INSERT -- BLOCKED (SELECT-only)`,
                    badge:         'Security event logged'
                }
            };
        }
        
        // ── AV-09: Rate Limit / High Traffic ───────────────────────────────────
        if (lower.includes("high traffic warning") || lower.includes("yüksek trafik uyarısı")) {
            return {
                role: 'guardrail',
                content: answer,
                guardrailType: 'RATE_LIMIT',
                guardrailDetail: {
                    detectionType: 'Object Enumeration (AV-09)',
                    trigger:       `"${q.substring(0, 40)}"`,
                    target:        'ID-based data scraping',
                    action:        'Automated sequential queries blocked',
                    badge:         'Security event logged · Rate Limit active'
                }
            };
        }

        // ── AV-12: Exfiltration ──────────────────────────────────────────────
        if (this.isUnsafeBlock(lower) && this.hasExfilTokens(qLower)) {
            return {
                role: 'guardrail',
                content: answer,
                guardrailType: 'EXFILTRATION',
                guardrailDetail: {
                    detectionType: 'Sensitive Data Leak (AV-12)',
                    trigger:       this.extractExfilTrigger(q),
                    target:        'password_hash / api_key / internal_cost',
                    action:        'Column schema restricted, request rejected',
                    badge:         'Column whitelist active · Security event logged'
                }
            };
        }

        // ── AV-07: Prompt Leakage ────────────────────────────────────────────
        if (this.isUnsafeBlock(lower) && (this.hasLeakageTokens(qLower) || lower.includes("e-commerce analytics. i can help you query") || lower.includes("tasarlanmış bir yapay zeka asistanıyım"))) {
            return {
                role: 'guardrail',
                content: answer,
                guardrailType: 'SECURITY',
                guardrailDetail: {
                    detectionType: 'System Prompt Leakage (AV-07)',
                    trigger:       `"${q.substring(0, 40)}"`,
                    target:        'System prompt / schema / configuration',
                    action:        'Introspection request rejected',
                    badge:         'Security event logged'
                }
            };
        }

        // ── AV-02: Cross-scope / authorization (not for ADMIN — they have full access) ──
        if (!isAdmin && (lower.includes('permission') || lower.includes('yetkisiz') || lower.includes('do not have permission'))) {
            const storeMatch = q.match(/store[_\s#]*(\d+)/i) || q.match(/#(\d+)/);
            return {
                role: 'guardrail',
                content: answer,
                guardrailType: 'ACCESS',
                guardrailDetail: {
                    detectionType: 'Horizontal Privilege Escalation (AV-02)',
                    trigger:       storeMatch ? `store_id = ${storeMatch[1]}` : `"${q.substring(0, 40)}"`,
                    target:        storeMatch ? `Store #${storeMatch[1]} data` : 'Other user/store data',
                    action:        'WHERE store_id restriction applied, access denied',
                    badge:         'Scope violation blocked'
                }
            };
        }

        // ── Generic unsafe block ─────────────────────────────────────────────
        if (this.isUnsafeBlock(lower)) {
            return {
                role: 'guardrail',
                content: answer,
                guardrailType: 'SECURITY',
                guardrailDetail: {
                    detectionType: 'Security Block',
                    trigger:       `"${q.substring(0, 40)}"`,
                    target:        'Platform security policy',
                    action:        'Request rejected',
                    badge:         'Security event logged'
                }
            };
        }

        return null;
    }

    askSuggestion(suggestion: string): void {
        this.userInput = suggestion;
        this.sendMessage();
    }

    // ── Utils ─────────────────────────────────────────────────────────────────

    private isUnsafeBlock(lower: string): boolean {
        return lower.includes("unable to help") ||
               lower.includes("cannot answer")  ||
               lower.includes("cannot help")    ||
               lower.includes("[security]")     ||
               lower.includes("read-only analytics") ||
               lower.includes("salt okunur") ||
               lower.includes("high traffic warning") ||
               lower.includes("yüksek trafik uyarısı") ||
               lower.includes("e-commerce analytics. i can help you query") ||
               lower.includes("tasarlanmış bir yapay zeka asistanıyım");
    }

    private hasInjectionTokens(q: string): boolean {
        return /ignore.*(previous|instructions?|prompt)|system\s+override|you are now|act as|jailbreak|dan mode|for testing.*admin|context.*system|elevated to admin/i.test(q);
    }

    private hasSqlInjectionTokens(q: string): boolean {
        return /drop\s+table|union\s+select|insert\s+into|--\s*$|;\s*(select|drop|insert|update|delete)|where\s+1\s*=\s*1/i.test(q);
    }

    private hasWriteTokens(q: string): boolean {
        return /\b(update|delete|drop|insert|set\s+my\s+role|set\s+role|add.*admin|create.*user)\b/i.test(q);
    }

    private hasExfilTokens(q: string): boolean {
        return /password_hash|api_key|internal.*cost|supplier.*margin|all.*internal|everything.*account/i.test(q);
    }

    private hasLeakageTokens(q: string): boolean {
        return /system\s+prompt|your\s+instructions?|initialization|repeat.*verbatim|print.*above|raw.*context|what\s+tables\s+exist/i.test(q);
    }

    // ── Trigger extractors ────────────────────────────────────────────────────

    private extractInjectionTrigger(q: string): string {
        const m = q.match(/ignore\s+(?:previous|your|all)\s+instructions?/i) ||
                  q.match(/\[(?:system|context)[^\]]*\]/i)                    ||
                  q.match(/you\s+are\s+now/i)                                 ||
                  q.match(/elevated\s+to\s+admin/i);
        return m ? `"${m[0]}"` : `"${q.substring(0, 45)}..."`;
    }

    private extractSqlTrigger(q: string): string {
        const m = q.match(/drop\s+table\s+\w+/i)  ||
                  q.match(/union\s+select[\w\s,]+/i)||
                  q.match(/insert\s+into\s+\w+/i)  ||
                  q.match(/where\s+1\s*=\s*1/i);
        return m ? `"${m[0]}"` : `"${q.substring(0, 45)}..."`;
    }

    private extractWriteTrigger(q: string): string {
        const m = q.match(/set\s+(?:my\s+)?role\s+to\s+\w+/i) ||
                  q.match(/add\s+.*admin/i)                     ||
                  q.match(/update\s+\w+\s+to/i);
        return m ? `"${m[0]}"` : `"${q.substring(0, 45)}..."`;
    }

    private extractExfilTrigger(q: string): string {
        const m = q.match(/password_hash|api_key|internal_cost|supplier_margin/i);
        return m ? `"${m[0]}"` : `"${q.substring(0, 45)}..."`;
    }

    // ── Bar chart helpers ─────────────────────────────────────────────────────

    private parseBarItems(text: string): BarItem[] {
        const re = /^(?:\d+\.\s+)?(.+?)[:：]\s*([\d,.]+)\s*(ad\.|adet|units?|₺|TL|%|kg)?/;
        const items: BarItem[] = [];
        for (const line of text.split('\n')) {
            const m = line.trim().match(re);
            if (m) {
                const value = parseFloat(m[2].replace(',', ''));
                if (!isNaN(value) && value > 0)
                    items.push({ label: m[1].trim(), value, unit: m[3]?.trim() || '', pct: 0 });
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

    // ── Guardrail label helpers ────────────────────────────────────────────────

    guardrailLabel(type?: GuardrailType): string {
        const map: Record<GuardrailType, string> = {
            INJECTION:      'Guardrail Agent — PROMPT INJECTION',
            SQL_INJECTION:  'Guardrail Agent — SQL INJECTION',
            SCOPE:          'Guardrail Agent — OUT OF SCOPE',
            ACCESS:         'Guardrail Agent — UNAUTHORIZED ACCESS',
            SECURITY:       'Guardrail Agent — SECURITY BLOCK',
            WRITE_ATTEMPT:  'Guardrail Agent — WRITE ATTEMPT',
            EXFILTRATION:   'Guardrail Agent — DATA LEAK',
            CONTEXT_POISON: 'Guardrail Agent — CONTEXT POISONING',
            RATE_LIMIT:     'Guardrail Agent — RATE LIMIT (AV-09)',
        };
        return type ? (map[type] ?? 'Guardrail Agent — SECURITY BLOCK') : 'Guardrail Agent';
    }

    guardrailHeaderText(type?: GuardrailType): string {
        if (type === 'SCOPE')        return 'This query falls out of the restricted data scope.';
        if (type === 'RATE_LIMIT')   return 'Sequential ID scraping attempt detected.';
        if (type === 'ACCESS')       return 'Unauthorized data access blocked.';
        return 'This message triggered security filters.';
    }

    guardrailBadgeClass(type?: GuardrailType): string {
        if (!type) return 'gr-badge-label injection';
        if (['INJECTION','SQL_INJECTION','WRITE_ATTEMPT','CONTEXT_POISON'].includes(type)) return 'gr-badge-label injection';
        if (['SCOPE','ACCESS','EXFILTRATION'].includes(type)) return 'gr-badge-label scope';
        if (type === 'RATE_LIMIT') return 'gr-badge-label rate';
        return 'gr-badge-label security';
    }

    // ── Misc helpers ──────────────────────────────────────────────────────────

    formatAiContent(content: string): string {
        // Guard: if response is an HTML error page, show friendly message
        const trimmed = (content || '').trimStart();
        if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
            return '<span style="color:#f87171;">⚠️ The AI encountered an internal error while processing this request. Please try rephrasing your question.</span>';
        }
        let html = this.aiService.formatMarkdown(content);
        // <img> tag'lerini küçük thumbnail + expand butonuna çevir
        html = html.replace(
            /<img\s+src="([^"]+)"[^>]*>/g,
            '<div class="chat-img-wrapper"><img src="$1" class="chat-img" alt="Graph"><div class="expand-btn" title="Büyüt">⤢</div></div>'
        );
        return html;
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
        ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
    }

    @HostListener('click', ['$event'])
    onClick(event: Event) {
        const target = event.target as HTMLElement;

        // Expand button click
        const expandBtn = target.closest('.expand-btn');
        if (expandBtn) {
            const wrapper = expandBtn.closest('.chat-img-wrapper');
            if (wrapper) {
                const img = wrapper.querySelector('img.chat-img') as HTMLImageElement;
                if (img?.src) this.expandGraph(img.src);
            }
            return;
        }

        // Resmin kendisine tıklayınca da expand açılır
        if (target.classList.contains('chat-img')) {
            const img = target as HTMLImageElement;
            if (img.src) this.expandGraph(img.src);
        }
    }

    expandGraph(src: string): void { this.expandedGraphSrc = src; this.isGraphExpanded = true; }
    closeExpandedGraph(): void     { this.isGraphExpanded = false; this.expandedGraphSrc = ''; }

    private scrollToBottom(): void {
        setTimeout(() => {
            if (this.messagesContainer) {
                const el = this.messagesContainer.nativeElement;
                el.scrollTop = el.scrollHeight;
            }
        }, 50);
    }
}
