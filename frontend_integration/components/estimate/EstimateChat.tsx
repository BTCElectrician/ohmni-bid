/**
 * Ohmni Estimate - EstimateChat
 * Drop into: components/estimate/EstimateChat.tsx
 *
 * AI-powered conversational estimating assistant
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Plus,
  Check,
  X,
  MessageSquare,
  Bot,
  User,
  Loader2,
  Lightbulb,
  Calculator,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { AddLineItemRequest } from '@/types/estimate';

// =============================================================================
// TYPES
// =============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedItems?: SuggestedItem[];
}

interface SuggestedItem {
  id: string;
  description: string;
  quantity: number;
  category: string;
  material_unit_cost: number;
  labor_hours_per_unit: number;
  unit_type: 'E' | 'C' | 'M' | 'Lot';
  confidence: number;
}

// =============================================================================
// PROMPTS
// =============================================================================

const QUICK_PROMPTS = [
  { icon: Lightbulb, text: 'Add lighting for 2,000 SF office' },
  { icon: Zap, text: 'Quote receptacles for open floor plan' },
  { icon: Calculator, text: 'Estimate 200A panel installation' },
];

// =============================================================================
// PROPS
// =============================================================================

interface EstimateChatProps {
  estimateId?: string;
  onItemsAdded: (items: AddLineItemRequest[]) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EstimateChat({ estimateId, onItemsAdded }: EstimateChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hey! I'm your estimating assistant. Tell me what you need to quote and I'll help you build your estimate. You can describe items, ask for recommendations, or paste specifications.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsTyping(true);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }

      // Simulate AI response (in production, call your AI endpoint)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock AI response with suggested items
      const mockItems: SuggestedItem[] = [
        {
          id: `item-${Date.now()}-1`,
          description: 'Duplex Receptacle - 20A, 125V, Commercial Grade',
          quantity: 24,
          category: 'POWER_RECEPTACLES',
          material_unit_cost: 12.5,
          labor_hours_per_unit: 0.5,
          unit_type: 'E',
          confidence: 0.95,
        },
        {
          id: `item-${Date.now()}-2`,
          description: 'GFI Receptacle - 20A, 125V',
          quantity: 6,
          category: 'POWER_RECEPTACLES',
          material_unit_cost: 28.0,
          labor_hours_per_unit: 0.6,
          unit_type: 'E',
          confidence: 0.88,
        },
        {
          id: `item-${Date.now()}-3`,
          description: '3/4" EMT Conduit w/ Fittings',
          quantity: 350,
          category: 'SITE_CONDUITS',
          material_unit_cost: 45.0,
          labor_hours_per_unit: 1.2,
          unit_type: 'C',
          confidence: 0.82,
        },
      ];

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Based on your request, I recommend the following items. I've estimated quantities based on typical requirements for similar projects. Select the items you want to add:`,
        timestamp: new Date(),
        suggestedItems: mockItems,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    },
    []
  );

  // Handle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Add selected items
  const addSelectedItems = (suggestedItems: SuggestedItem[]) => {
    const itemsToAdd = suggestedItems.filter((item) => selectedItems.has(item.id));

    const lineItems: AddLineItemRequest[] = itemsToAdd.map((item) => ({
      category: item.category as any,
      description: item.description,
      quantity: item.quantity,
      material_unit_cost: item.material_unit_cost,
      labor_hours_per_unit: item.labor_hours_per_unit,
      unit_type: item.unit_type,
    }));

    onItemsAdded(lineItems);

    // Clear selection
    setSelectedItems(new Set());

    // Add confirmation message
    const confirmMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Added ${itemsToAdd.length} item${itemsToAdd.length !== 1 ? 's' : ''} to your estimate. What else would you like to add?`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, confirmMessage]);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-electric-blue/20">
            <Bot className="w-5 h-5 text-electric-blue" />
          </div>
          <div>
            <h3 className="font-medium text-text-primary">Estimating Assistant</h3>
            <p className="text-xs text-text-secondary">Powered by AI</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'flex-row-reverse' : ''
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                message.role === 'user'
                  ? 'bg-electric-blue/20'
                  : 'bg-surface-elevated'
              )}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-electric-blue" />
              ) : (
                <Bot className="w-4 h-4 text-text-secondary" />
              )}
            </div>

            {/* Content */}
            <div
              className={cn(
                'flex-1 min-w-0',
                message.role === 'user' ? 'text-right' : ''
              )}
            >
              <div
                className={cn(
                  'inline-block px-4 py-2 rounded-xl max-w-[90%] text-left',
                  message.role === 'user'
                    ? 'bg-electric-blue text-white'
                    : 'bg-surface-elevated text-text-primary'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* Suggested Items */}
              {message.suggestedItems && message.suggestedItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.suggestedItems.map((item) => {
                    const isSelected = selectedItems.has(item.id);
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
                          isSelected
                            ? 'bg-electric-blue/10 border-electric-blue/50'
                            : 'bg-surface-elevated/50 border-border-subtle'
                        )}
                      >
                        <button
                          onClick={() => toggleItemSelection(item.id)}
                          className={cn(
                            'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                            isSelected
                              ? 'bg-electric-blue border-electric-blue'
                              : 'border-border-subtle'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-text-secondary">
                              Qty: {item.quantity}
                            </span>
                            <span className="text-xs text-text-secondary">•</span>
                            <span className="text-xs text-text-secondary">
                              ${(item.material_unit_cost * item.quantity).toFixed(0)} mat
                            </span>
                            <span className="text-xs text-electric-blue/70">
                              {(item.confidence * 100).toFixed(0)}% match
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Add Selected Button */}
                  {selectedItems.size > 0 && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => addSelectedItems(message.suggestedItems!)}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 py-2 rounded-xl',
                        'bg-gradient-to-r from-electric-blue to-electric-glow',
                        'text-white font-medium text-sm',
                        'shadow-lg shadow-electric-blue/25'
                      )}
                    >
                      <Plus className="w-4 h-4" />
                      Add {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''} to Estimate
                    </motion.button>
                  )}
                </div>
              )}

              <p className="text-[10px] text-text-secondary mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </motion.div>
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center">
                <Bot className="w-4 h-4 text-text-secondary" />
              </div>
              <div className="flex items-center gap-1 px-4 py-2 rounded-xl bg-surface-elevated">
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                  className="w-2 h-2 rounded-full bg-electric-blue"
                />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  className="w-2 h-2 rounded-full bg-electric-blue"
                />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  className="w-2 h-2 rounded-full bg-electric-blue"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length === 1 && (
        <div className="flex-shrink-0 px-4 pb-2">
          <p className="text-xs text-text-secondary mb-2">Try asking:</p>
          <div className="space-y-1">
            {QUICK_PROMPTS.map((prompt, idx) => {
              const IconComponent = prompt.icon;
              return (
                <button
                  key={idx}
                  onClick={() => sendMessage(prompt.text)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left',
                    'bg-surface-elevated/50 border border-border-subtle',
                    'text-text-secondary hover:text-text-primary',
                    'hover:border-electric-blue/30 transition-all duration-200'
                  )}
                >
                  <IconComponent className="w-4 h-4 text-electric-blue/70" />
                  <span className="text-sm">{prompt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-border-subtle">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Describe what you need to quote..."
            rows={1}
            className={cn(
              'w-full px-4 py-3 pr-12 rounded-xl resize-none',
              'bg-surface-elevated border border-border-subtle',
              'text-text-primary placeholder:text-text-secondary',
              'focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue',
              'transition-all duration-200'
            )}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className={cn(
              'absolute right-2 bottom-2 p-2 rounded-lg transition-all duration-200',
              input.trim() && !isTyping
                ? 'bg-electric-blue text-white hover:bg-electric-glow'
                : 'bg-surface-elevated text-text-secondary'
            )}
          >
            {isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-text-secondary mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

export default EstimateChat;
