import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Loader2, Send, Mail, MessageSquare, Phone, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface SupplierMessage {
  id?: number;
  supplier_id: string;
  sender: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  message: string;
  sent_via: string;
  created_at: string;
}

interface ContactModalProps {
  supplier: {
    supplier_id: string;
    name: string;
    phone?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
  initialMessage?: string;
}

export function ContactModal({ supplier, isOpen, onClose, initialSubject = '', initialMessage = '' }: ContactModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sentVia, setSentVia] = useState<'Portal' | 'Email' | 'SMS'>('Portal');
  const [phone, setPhone] = useState('');
  const [messages, setMessages] = useState<SupplierMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  const fetchHistory = async () => {
    if (!supplier) return;
    setIsLoadingHistory(true);
    try {
      const response = await api.get(`/suppliers/${supplier.supplier_id}/messages`);
      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch message history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && supplier) {
      setSubject(initialSubject);
      setMessage(initialMessage);
      setPhone(supplier.phone || '+91 98765 43210');
      fetchHistory();
    }
  }, [isOpen, supplier, initialSubject, initialMessage]);

  const handleGenerateDraft = async () => {
    if (!supplier || !subject.trim()) return;
    setIsGeneratingDraft(true);
    try {
      const response = await api.post(`/suppliers/${supplier.supplier_id}/draft-email`, {
        subject: subject.trim()
      });
      if (response.data.success) {
        setMessage(response.data.draft);
        toast.success('AI draft email generated!');
      }
    } catch (error) {
      console.error('Failed to generate draft:', error);
      toast.error('Failed to generate draft.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in both subject and message.');
      return;
    }

    setIsSending(true);
    try {
      const response = await api.post(`/suppliers/${supplier.supplier_id}/messages`, {
        sender: 'Admin',
        sender_email: 'admin@vendorverse.com',
        recipient_email: `${supplier.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        recipient_phone: sentVia === 'SMS' ? phone : null,
        subject: subject.trim(),
        message: message.trim(),
        sent_via: sentVia,
      });

      if (response.data.success) {
        toast.success(`Message sent successfully via ${sentVia === 'SMS' ? 'SMS' : sentVia}!`);
        setMessage('');
        setSubject('');
        fetchHistory();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !supplier) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-title"
    >
      <div
        className="card-base w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 id="contact-title" className="text-lg font-semibold text-foreground">Contact Supplier</h2>
              <p className="text-sm text-muted-foreground">Send message or email to {supplier.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close modal">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Double Column Layout: Form Left, Thread Right */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Form Column */}
          <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-thin">
            <div className="space-y-1.5">
              <label htmlFor="recipient" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recipient Email</label>
              <input
                id="recipient"
                type="text"
                disabled
                className="input-base opacity-60 cursor-not-allowed bg-secondary/30"
                value={`${supplier.name.toLowerCase().replace(/\s+/g, '')}@example.com`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Send Communication Via</label>
              <div className="flex gap-2">
                {([
                  { id: 'Portal', label: 'Portal', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                  { id: 'Email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
                  { id: 'SMS', label: 'Contact No.', icon: <Phone className="w-3.5 h-3.5" /> }
                ] as const).map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSentVia(option.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      sentVia === option.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                    }`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {sentVia === 'SMS' && (
              <div className="space-y-1.5 animate-fade-in">
                <label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recipient Phone (SMS)</label>
                <input
                  id="phone"
                  type="text"
                  className="input-base"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="subject" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</label>
              <div className="flex gap-2">
                <input
                  id="subject"
                  type="text"
                  className="input-base flex-1"
                  placeholder="e.g. Quality SLA warning or Shipment Inquiry"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={handleGenerateDraft}
                  disabled={isGeneratingDraft || !subject.trim()}
                  className="px-3 py-2.5 rounded-lg text-xs font-semibold bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                  title="Generate email draft using AI based on this subject"
                >
                  {isGeneratingDraft ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Drafting...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" />AI Draft</>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="message-body" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message Content</label>
              <textarea
                id="message-body"
                className="w-full min-h-[150px] input-base resize-none"
                placeholder="Type your message here..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full btn-primary flex items-center justify-center gap-2 font-bold py-2.5"
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
              ) : (
                <><Send className="w-4 h-4" />Send Message</>
              )}
            </button>
          </form>

          {/* Thread History Column */}
          <div className="w-full md:w-96 flex flex-col overflow-hidden bg-secondary/5">
            <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Communication History</h3>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                {messages.length} messages
              </span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
              {isLoadingHistory ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs font-medium">No conversation history</p>
                  <p className="text-[10px] mt-1">Sent messages will appear here in chronological thread.</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isAdmin = msg.sender === 'Admin';
                  return (
                    <div key={index} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-xl p-3 border text-xs leading-relaxed ${
                          isAdmin
                            ? 'bg-primary/10 border-primary/20 text-foreground'
                            : 'bg-muted/40 border-border text-foreground'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-4 mb-1 border-b border-border/10 pb-0.5 text-[9px] font-bold text-muted-foreground">
                          <span>{msg.sender} via {msg.sent_via}</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="font-semibold text-[10px] text-foreground mb-1">Re: {msg.subject}</p>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <span className="text-[8px] text-muted-foreground mt-1 px-1">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
