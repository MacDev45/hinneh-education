/**
 * Messagerie Interne
 * Conversations, messages, envoi avec pièces jointes simulées
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Search, Plus, Paperclip, Check, CheckCheck, Circle, User, Users, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';
import type { Staff } from '@/lib/index';
import { formatStudentName } from '@/lib/index';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  convId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  read: boolean;
  attachment?: string;
}

interface Conversation {
  id: string;
  participants: string[];
  participantNames: string[];
  subject: string;
  lastMessage: string;
  lastAt: Date;
  unread: number;
  isGroup: boolean;
}

const ME_ID = 'current_user';
const ME_NAME = 'Moi';

const INIT_CONVS: Conversation[] = [
  { id: 'c1', participants: [ME_ID, 's1'], participantNames: ['Directeur Konaré'], subject: 'Réunion pédagogique', lastMessage: 'Confirmez votre présence SVP', lastAt: new Date(Date.now() - 60000 * 5), unread: 2, isGroup: false },
  { id: 'c2', participants: [ME_ID, 's2', 's3'], participantNames: ['Groupe enseignants 6ème'], subject: 'Groupe enseignants 6ème', lastMessage: 'Le programme est disponible', lastAt: new Date(Date.now() - 60000 * 45), unread: 0, isGroup: true },
  { id: 'c3', participants: [ME_ID, 's4'], participantNames: ['Mme Coulibaly (Comptabilité)'], subject: 'Frais de scolarité', lastMessage: 'Merci pour les informations', lastAt: new Date(Date.now() - 3600000 * 3), unread: 0, isGroup: false },
];

const INIT_MSGS: Message[] = [
  { id: 'm1', convId: 'c1', senderId: 's1', senderName: 'Dir. Konaré', content: 'Bonjour, la réunion pédagogique est prévue demain à 9h.', timestamp: new Date(Date.now() - 60000 * 10), read: true },
  { id: 'm2', convId: 'c1', senderId: 's1', senderName: 'Dir. Konaré', content: 'Confirmez votre présence SVP', timestamp: new Date(Date.now() - 60000 * 5), read: false },
  { id: 'm3', convId: 'c2', senderId: 's2', senderName: 'M. Traoré', content: 'Le programme du 2ème trimestre est disponible en salle des profs.', timestamp: new Date(Date.now() - 60000 * 45), read: true },
  { id: 'm4', convId: 'c3', senderId: ME_ID, senderName: ME_NAME, content: 'Bonjour, pouvez-vous me confirmer le montant des frais restants ?', timestamp: new Date(Date.now() - 3600000 * 4), read: true },
  { id: 'm5', convId: 'c3', senderId: 's4', senderName: 'Mme Coulibaly', content: 'Merci pour les informations', timestamp: new Date(Date.now() - 3600000 * 3), read: true },
];

const timeAgo = (d: Date) => {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'maintenant';
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

// ─── Composant ───────────────────────────────────────────────────────────────

export default function MessagerieSpace() {
  const { toast } = useToast();
  const [convs, setConvs] = useState<Conversation[]>(INIT_CONVS);
  const [messages, setMessages] = useState<Message[]>(INIT_MSGS);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>('c1');
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [openNew, setOpenNew] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { apiClient.getStaff().then(setStaff).catch(() => {}); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeConv, messages]);

  const currentConv = convs.find(c => c.id === activeConv);
  const convMessages = useMemo(() => messages.filter(m => m.convId === activeConv), [messages, activeConv]);

  const filteredConvs = useMemo(() => convs.filter(c =>
    c.subject.toLowerCase().includes(search.toLowerCase()) ||
    c.participantNames.join(' ').toLowerCase().includes(search.toLowerCase())
  ), [convs, search]);

  const totalUnread = convs.reduce((s, c) => s + c.unread, 0);

  const openConv = (id: string) => {
    setActiveConv(id);
    setConvs(p => p.map(c => c.id === id ? { ...c, unread: 0 } : c));
    setMessages(p => p.map(m => m.convId === id ? { ...m, read: true } : m));
  };

  const sendMessage = () => {
    if (!input.trim() || !activeConv) return;
    const msg: Message = { id: `m-${Date.now()}`, convId: activeConv, senderId: ME_ID, senderName: ME_NAME, content: input.trim(), timestamp: new Date(), read: true };
    setMessages(p => [...p, msg]);
    setConvs(p => p.map(c => c.id === activeConv ? { ...c, lastMessage: input.trim(), lastAt: new Date() } : c));
    setInput('');
  };

  const createConv = () => {
    if (!newSubject || !newRecipient) { toast({ variant: 'destructive', title: 'Sujet et destinataire requis' }); return; }
    const s = staff.find(x => x.id === newRecipient);
    const name = s ? `${formatStudentName(s)}` : newRecipient;
    const conv: Conversation = { id: `cv-${Date.now()}`, participants: [ME_ID, newRecipient], participantNames: [name], subject: newSubject, lastMessage: '', lastAt: new Date(), unread: 0, isGroup: false };
    setConvs(p => [conv, ...p]);
    setActiveConv(conv.id);
    setOpenNew(false); setNewSubject(''); setNewRecipient('');
    toast({ title: 'Conversation créée' });
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Sidebar conversations */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-80 border-r bg-card flex flex-col shrink-0">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" />Messages{totalUnread > 0 && <Badge variant="destructive" className="text-[10px]">{totalUnread}</Badge>}</h2>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setOpenNew(true)}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-sm" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.map(c => (
              <button key={c.id} onClick={() => openConv(c.id)}
                className={`w-full text-left p-3 border-b hover:bg-muted/50 flex items-start gap-3 transition-colors ${activeConv === c.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ${c.isGroup ? 'bg-purple-500' : 'bg-primary'}`}>
                  {c.isGroup ? <Users className="h-4 w-4" /> : c.participantNames[0]?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-sm truncate ${c.unread > 0 ? 'font-bold' : 'font-medium'}`}>{c.subject}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.lastAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.participantNames.join(', ')}</p>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate ${c.unread > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{c.lastMessage}</p>
                    {c.unread > 0 && <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center shrink-0">{c.unread}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Zone messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!currentConv ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>Sélectionnez une conversation</p></div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b bg-card flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${currentConv.isGroup ? 'bg-purple-500' : 'bg-primary'}`}>
                  {currentConv.isGroup ? <Users className="h-4 w-4" /> : currentConv.participantNames[0]?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{currentConv.subject}</p>
                  <p className="text-xs text-muted-foreground">{currentConv.participantNames.join(', ')}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence>
                  {convMessages.map(m => {
                    const isMe = m.senderId === ME_ID;
                    return (
                      <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                        {!isMe && <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{m.senderName[0]}</div>}
                        <div className={`max-w-xs lg:max-w-md rounded-2xl px-3.5 py-2.5 ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                          {!isMe && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{m.senderName}</p>}
                          <p className="text-sm leading-relaxed">{m.content}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            <span className="text-[10px]">{timeAgo(m.timestamp)}</span>
                            {isMe && (m.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>

              <div className="p-4 border-t bg-card">
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0"><Paperclip className="h-4 w-4" /></Button>
                  <Input className="flex-1 h-9 text-sm" placeholder="Écrire un message…" value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} />
                  <Button size="sm" className="h-9 w-9 p-0 shrink-0" onClick={sendMessage} disabled={!input.trim()}><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialog nouvelle conversation */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nouvelle conversation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Sujet *</Label><Input placeholder="Objet du message" value={newSubject} onChange={e => setNewSubject(e.target.value)} /></div>
            <div className="space-y-1">
              <Label>Destinataire *</Label>
              <Select value={newRecipient} onValueChange={setNewRecipient}>
                <SelectTrigger><SelectValue placeholder="Choisir un agent" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{formatStudentName(s)} — {s.fonction}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Annuler</Button>
            <Button onClick={createConv}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
