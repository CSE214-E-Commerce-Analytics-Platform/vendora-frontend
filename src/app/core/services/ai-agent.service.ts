import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AiResponse {
    answer: string;
    sqlQuery: string | null;
    intent: string | null;
    guardrailReason: string | null;
    trace?: string[];
    suggestions?: string[];
}

@Injectable({
    providedIn: 'root'
})
export class AiAgentService {

    // Artık tek bir endpoint yok, rol tabanlı dinamik URL oluşturacağız
    private readonly baseAiUrl = `${environment.baseUrl}/ai/ask`;

    // Patterns that indicate prompt injection attempts
    private readonly INJECTION_PATTERNS = [
        /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
        /system\s*:\s*/i,
        /you\s+are\s+now\s+(a|an)\s+/i,
        /forget\s+(all\s+)?(previous|your)\s+(instructions|rules|prompts)/i,
        /override\s+(system|safety|security)/i,
        /pretend\s+(you\s+are|to\s+be)/i,
        /act\s+as\s+(a|an|if)/i,
        /do\s+not\s+follow\s+(your|the)\s+(rules|instructions)/i,
        /reveal\s+(your|the|system)\s+(prompt|instructions|rules)/i,
        /what\s+(are|is)\s+your\s+(system|initial)\s+(prompt|instructions)/i,
        /disregard\s+(all|any|your)\s+(previous|prior|safety)/i,
        /jailbreak/i,
        /DAN\s+mode/i,
    ];

    private readonly MAX_QUERY_LENGTH = 500;

    constructor(private http: HttpClient) { }

    /**
     * Validates a user query for prompt injection attacks.
     * Returns null if safe, or an error message if suspicious.
     */
    validateQuery(query: string): string | null {
        if (!query || query.trim().length === 0) {
            return 'Please enter a question.';
        }

        if (query.length > this.MAX_QUERY_LENGTH) {
            return `Your question is too long. Maximum ${this.MAX_QUERY_LENGTH} characters allowed.`;
        }

        for (const pattern of this.INJECTION_PATTERNS) {
            if (pattern.test(query)) {
                return 'Your question contains restricted patterns. Please rephrase your question about products.';
            }
        }

        return null;
    }

    /**
     * Patterns that indicate a raw error or non-user-friendly response from the backend.
     */
    private readonly ERROR_RESPONSE_PATTERNS = [
        /\b\d{3}\s+(Service Unavailable|Internal Server Error|Bad Gateway|Not Found|Forbidden|Unauthorized|Bad Request|Gateway Timeout)\b/i,
        /\b(UNAVAILABLE|INTERNAL|DEADLINE_EXCEEDED|RESOURCE_EXHAUSTED|PERMISSION_DENIED)\b/,
        /\berror\b.*\bcode\b.*\bmessage\b/is,
        /\bstatus\b.*\b(UNAVAILABLE|ERROR|FAIL)\b/i,
        /"error"\s*:\s*\{/i,
        /\bException\b|\bStackTrace\b|\bat\s+[\w.]+\(.*:\d+\)/i,
        /\bPOST\s+request\s+for\b/i,
        /\bgenerativelanguage\.googleapis\.com\b/i,
        /\bThis model is currently experiencing high demand\b/i,
        /\bInformation regarding .* is unavailable in the provided dataset\b/i,
        /\bThe data only includes .* associated with\b/i,
    ];

    private readonly FALLBACK_MESSAGE =
        'Sorry, I wasn\'t able to get a proper answer right now. Please try again in a moment.';

    /**
     * Sends a validated query to the AI agent backend based on the user's role.
     * JSON body olarak gönderilir (@RequestBody AskAiRequest'e denk gelir).
     */
    askQuestion(question: string, role: string): Observable<AiResponse> {
        let endpointSuffix = '';
        if (role === 'INDIVIDUAL') endpointSuffix = '/individual';
        else if (role === 'CORPORATE') endpointSuffix = '/corporate';
        else if (role === 'ADMIN') endpointSuffix = '/admin';
        else throw new Error('Geçersiz veya eksik kullanıcı rolü.');

        const url = `${this.baseAiUrl}${endpointSuffix}`;
        const body = { question };

        return this.http.post(url, body, { responseType: 'text' }).pipe(
            map((raw: string) => {
                try {
                    // Spring Boot wraps as { payload: { answer, sql_query, intent, guardrail_reason } }
                    const parsed = JSON.parse(raw);

                    let answerText = raw;
                    if (parsed.payload && typeof parsed.payload === 'object') {
                        answerText = parsed.payload.answer ?? parsed.payload.final_answer ?? '';
                    } else if (typeof parsed.payload === 'string') {
                        answerText = parsed.payload;
                    } else if (parsed.answer) {
                        answerText = parsed.answer;
                    }

                    const answer = this.sanitizeResponse(answerText);
                    return {
                        answer,
                        sqlQuery: parsed.payload?.sql_query ?? parsed.sqlQuery ?? parsed.sql_query ?? null,
                        intent: parsed.payload?.intent ?? parsed.intent ?? null,
                        guardrailReason: parsed.payload?.guardrail_reason ?? parsed.guardrailReason ?? parsed.guardrail_reason ?? null,
                        trace: parsed.payload?.trace ?? parsed.trace ?? [],
                        suggestions: parsed.payload?.suggestions ?? parsed.suggestions ?? [],
                    } as AiResponse;
                } catch {
                    return {
                        answer: this.sanitizeResponse(raw),
                        sqlQuery: null, intent: null, guardrailReason: null, trace: [], suggestions: []
                    } as AiResponse;
                }
            })
        );
    }

    /**
     * Checks if a response looks like a raw error or non-user-friendly message
     * and replaces it with a generic friendly response.
     */
    private sanitizeResponse(response: string): string {
        for (const pattern of this.ERROR_RESPONSE_PATTERNS) {
            if (pattern.test(response)) {
                return this.FALLBACK_MESSAGE;
            }
        }
        return response;
    }

    /**
     * Converts basic markdown syntax to HTML:
     */
    formatMarkdown(text: string): string {
        // ── Step 1: Extract markdown images BEFORE any escaping ──────────────
        // Placeholder map so URLs (which contain & chars) survive HTML escaping
        const images: { placeholder: string; alt: string; url: string }[] = [];
        const withPlaceholders = text.replace(
            /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g,
            (_match, alt, url) => {
                const placeholder = `__IMG_${images.length}__`;
                images.push({ placeholder, alt, url });
                return placeholder;
            }
        );

        // ── Step 2: HTML-escape the rest ──────────────────────────────────────
        let html = withPlaceholders
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // ── Step 3: Inline markdown ───────────────────────────────────────────
        // **bold**
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // *italic*
        html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

        // ── Step 4: Line-by-line rendering ────────────────────────────────────
        const lines = html.split('\n');
        const result: string[] = [];
        let inList = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || /^\*\s/.test(trimmed)) {
                if (!inList) { result.push('<ul>'); inList = true; }
                const content = trimmed.replace(/^[•\-\*]\s+/, '');
                result.push(`<li>${content}</li>`);
            } else {
                if (inList) { result.push('</ul>'); inList = false; }
                if (trimmed === '') {
                    result.push('<br>');
                } else {
                    result.push(`<p>${trimmed}</p>`);
                }
            }
        }
        if (inList) result.push('</ul>');

        let output = result.join('');

        // ── Step 5: Restore image placeholders as <img> tags ─────────────────
        for (const img of images) {
            output = output.replace(
                // placeholder may be wrapped in <p>...</p> by the line processor
                new RegExp(`(?:<p>)?${img.placeholder}(?:</p>)?`),
                `<img src="${img.url}" alt="${img.alt}" style="width:100%;max-width:340px;height:auto;border-radius:8px;margin-top:8px;display:block;" loading="lazy">`
            );
        }

        return output;
    }
}
