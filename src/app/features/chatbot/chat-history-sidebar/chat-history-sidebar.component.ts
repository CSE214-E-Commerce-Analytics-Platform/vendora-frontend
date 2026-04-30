import { Component, OnInit, inject, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatHistoryService, ChatHistoryItem } from '../../../core/services/chat-history.service';
import { LucideAngularModule, History, Pencil, Trash2, Plus, X, Search, MessageSquare, Clock, Check } from 'lucide-angular';

interface GroupedHistory {
    label: string;
    items: ChatHistoryItem[];
}

@Component({
    selector: 'app-chat-history-sidebar',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './chat-history-sidebar.component.html',
    styleUrls: ['./chat-history-sidebar.component.css']
})
export class ChatHistorySidebarComponent implements OnInit {
    @Input() isOpen = false;
    @Output() closed     = new EventEmitter<void>();
    @Output() selected   = new EventEmitter<ChatHistoryItem>();
    @Output() newChat    = new EventEmitter<void>();

    private historyService = inject(ChatHistoryService);

    // Icons
    readonly icons = { History, Pencil, Trash2, Plus, X, Search, MessageSquare, Clock, Check };

    items: ChatHistoryItem[] = [];
    groups: GroupedHistory[] = [];
    searchQuery = '';
    editingId: number | null = null;
    editTitle  = '';
    isLoading  = true;

    ngOnInit(): void {
        this.loadHistory();
    }

    loadHistory(): void {
        this.isLoading = true;
        this.historyService.getAll().subscribe({
            next: (data) => {
                this.items = data;
                this.buildGroups();
                this.isLoading = false;
            },
            error: () => { this.isLoading = false; }
        });
    }

    private buildGroups(): void {
        const now      = new Date();
        const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 86400000);
        const weekAgo  = new Date(today.getTime() - 7 * 86400000);
        const monthAgo = new Date(today.getTime() - 30 * 86400000);

        const filtered = this.searchQuery.trim()
            ? this.items.filter(i => i.title.toLowerCase().includes(this.searchQuery.toLowerCase()))
            : this.items;

        const buckets: Record<string, ChatHistoryItem[]> = {
            'Today':      [],
            'Yesterday':  [],
            'This Week':  [],
            'This Month': [],
            'Older':      []
        };

        for (const item of filtered) {
            const d = new Date(item.createdAt);
            if (d >= today)          buckets['Today'].push(item);
            else if (d >= yesterday) buckets['Yesterday'].push(item);
            else if (d >= weekAgo)   buckets['This Week'].push(item);
            else if (d >= monthAgo)  buckets['This Month'].push(item);
            else                     buckets['Older'].push(item);
        }

        this.groups = Object.entries(buckets)
            .filter(([_, items]) => items.length > 0)
            .map(([label, items]) => ({ label, items }));
    }

    onSearch(): void {
        this.buildGroups();
    }

    selectItem(item: ChatHistoryItem): void {
        this.selected.emit(item);
    }

    startRename(item: ChatHistoryItem, event: Event): void {
        event.stopPropagation();
        this.editingId = item.id;
        this.editTitle = item.title;
    }

    confirmRename(item: ChatHistoryItem): void {
        if (!this.editTitle.trim()) return;
        this.historyService.updateTitle(item.id, this.editTitle.trim()).subscribe({
            next: (updated) => {
                item.title = updated.title;
                this.editingId = null;
                this.buildGroups();
            }
        });
    }

    cancelRename(): void {
        this.editingId = null;
    }

    deleteItem(item: ChatHistoryItem, event: Event): void {
        event.stopPropagation();
        this.historyService.delete(item.id).subscribe({
            next: () => {
                this.items = this.items.filter(i => i.id !== item.id);
                this.buildGroups();
            }
        });
    }

    onNewChat(): void {
        this.newChat.emit();
    }

    close(): void {
        this.closed.emit();
    }
}
