import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare, Bell, Megaphone, Headset, Search, Plus, Eye, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/index';
import { motion } from 'framer-motion';
import { springPresets, fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';

interface Conversation {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  timestamp: Date;
  unread: number;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  target: string;
  author: string;
  date: Date;
  viewCount: number;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: 'Basse' | 'Moyenne' | 'Haute' | 'Urgente';
  status: 'Ouvert' | 'En cours' | 'Résolu';
  requester: string;
  assignedTo: string;
  createdAt: Date;
  responseTime: string;
}

const mockConversations: Conversation[] = [];

const mockMessages: Message[] = [];

const mockAnnouncements: Announcement[] = [];

const mockTickets: Ticket[] = [];

const messageTemplates = [
  { id: 'tpl-1', name: 'Rappel paiement', content: 'Cher parent, nous vous rappelons que le paiement des frais de scolarité est attendu avant le...' },
  { id: 'tpl-2', name: 'Convocation réunion', content: 'Vous êtes convié(e) à une réunion le [DATE] à [HEURE] concernant...' },
  { id: 'tpl-3', name: 'Absence élève', content: 'Nous avons constaté l\'absence de votre enfant le [DATE]. Merci de nous fournir une justification...' },
  { id: 'tpl-4', name: 'Félicitations', content: 'Nous tenons à féliciter votre enfant pour ses excellents résultats...' },
];

export default function Communication() {
  const [selectedConversation, setSelectedConversation] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationTarget, setNotificationTarget] = useState('all');
  const [notificationChannels, setNotificationChannels] = useState({
    sms: false,
    email: true,
    push: true,
    whatsapp: false,
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  const currentConversation = mockConversations.find((c) => c.id === selectedConversation);
  const filteredConversations = mockConversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ticketColumns: Column[] = [
    {
      key: 'subject',
      label: 'Sujet',
      render: (row: Ticket) => (
        <div className="font-medium">{row.subject}</div>
      ),
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (row: Ticket) => (
        <Badge variant="outline">{row.category}</Badge>
      ),
    },
    {
      key: 'priority',
      label: 'Priorité',
      render: (row: Ticket) => {
        const colors: Record<string, string> = {
          Basse: 'bg-blue-100 text-blue-700',
          Moyenne: 'bg-yellow-100 text-yellow-700',
          Haute: 'bg-orange-100 text-orange-700',
          Urgente: 'bg-red-100 text-red-700',
        };
        return (
          <Badge className={colors[row.priority]}>{row.priority}</Badge>
        );
      },
    },
    {
      key: 'status',
      label: 'Statut',
      render: (row: Ticket) => {
        const icons: Record<string, JSX.Element> = {
          Ouvert: <AlertCircle className="h-4 w-4" />,
          'En cours': <Clock className="h-4 w-4" />,
          Résolu: <CheckCircle2 className="h-4 w-4" />,
        };
        const colors: Record<string, string> = {
          Ouvert: 'bg-gray-100 text-gray-700',
          'En cours': 'bg-blue-100 text-blue-700',
          Résolu: 'bg-green-100 text-green-700',
        };
        return (
          <Badge className={`${colors[row.status]} flex items-center gap-1`}>
            {icons[row.status]}
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: 'requester',
      label: 'Demandeur',
    },
    {
      key: 'assignedTo',
      label: 'Assigné à',
    },
    {
      key: 'responseTime',
      label: 'Temps de réponse',
      render: (row: Ticket) => (
        <span className="text-muted-foreground">{row.responseTime}</span>
      ),
    },
  ];

  const handleSendMessage = () => {
    if (messageText.trim()) {
      console.log('Sending message:', messageText);
      setMessageText('');
    }
  };

  const handleSendNotification = () => {
    console.log('Sending notification:', {
      target: notificationTarget,
      channels: notificationChannels,
      message: notificationMessage,
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = messageTemplates.find((t) => t.id === templateId);
    if (template) {
      setNotificationMessage(template.content);
      setSelectedTemplate(templateId);
    }
  };

  return (
    <Layout>
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Centre de Communication</h1>
              <p className="text-muted-foreground mt-1">
                Messagerie, notifications et gestion des demandes
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Tabs defaultValue="messagerie" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="messagerie" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Messagerie interne
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="annonces" className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Annonces
              </TabsTrigger>
              <TabsTrigger value="tickets" className="flex items-center gap-2">
                <Headset className="h-4 w-4" />
                Centre relationnel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="messagerie" className="space-y-4">
              <Card>
                <CardContent className="p-0">
                  <div className="grid lg:grid-cols-[320px_1fr] h-[600px]">
                    <div className="border-r">
                      <div className="p-4 border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Rechercher une conversation..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-[calc(600px-73px)]">
                        <div className="p-2">
                          {filteredConversations.map((conversation) => (
                            <button
                              key={conversation.id}
                              onClick={() => setSelectedConversation(conversation.id)}
                              className={`w-full p-3 rounded-lg text-left transition-colors hover:bg-accent ${
                                selectedConversation === conversation.id ? 'bg-accent' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>
                                    {conversation.name
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-sm truncate">
                                      {conversation.name}
                                    </p>
                                    {conversation.unread > 0 && (
                                      <Badge className="h-5 min-w-5 px-1.5 text-xs">
                                        {conversation.unread}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {conversation.role}
                                  </p>
                                  <p className="text-sm text-muted-foreground truncate mt-1">
                                    {conversation.lastMessage}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDateTime(conversation.timestamp)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="flex flex-col">
                      {currentConversation && (
                        <>
                          <div className="p-4 border-b">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {currentConversation.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{currentConversation.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {currentConversation.role}
                                </p>
                              </div>
                            </div>
                          </div>

                          <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                              {mockMessages.map((message) => (
                                <div
                                  key={message.id}
                                  className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[70%] rounded-lg p-3 ${
                                      message.isOwn
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                    }`}
                                  >
                                    <p className="text-sm">{message.content}</p>
                                    <p
                                      className={`text-xs mt-1 ${
                                        message.isOwn
                                          ? 'text-primary-foreground/70'
                                          : 'text-muted-foreground'
                                      }`}
                                    >
                                      {formatDateTime(message.timestamp)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>

                          <div className="p-4 border-t">
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Écrire un message..."
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                className="min-h-[60px] resize-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                  }
                                }}
                              />
                              <Button
                                onClick={handleSendMessage}
                                disabled={!messageText.trim()}
                                size="icon"
                                className="h-[60px] w-[60px]"
                              >
                                <Send className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Envoyer une notification</CardTitle>
                  <CardDescription>
                    Diffusez des informations importantes à vos destinataires
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Destinataires</Label>
                    <Select value={notificationTarget} onValueChange={setNotificationTarget}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les établissements</SelectItem>
                        <SelectItem value="school">Un établissement spécifique</SelectItem>
                        <SelectItem value="cycle">Un cycle</SelectItem>
                        <SelectItem value="niveau">Un niveau</SelectItem>
                        <SelectItem value="classe">Une classe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Canaux de diffusion</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sms"
                          checked={notificationChannels.sms}
                          onCheckedChange={(checked) =>
                            setNotificationChannels({ ...notificationChannels, sms: !!checked })
                          }
                        />
                        <Label htmlFor="sms" className="cursor-pointer">
                          SMS
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="email"
                          checked={notificationChannels.email}
                          onCheckedChange={(checked) =>
                            setNotificationChannels({ ...notificationChannels, email: !!checked })
                          }
                        />
                        <Label htmlFor="email" className="cursor-pointer">
                          Email
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="push"
                          checked={notificationChannels.push}
                          onCheckedChange={(checked) =>
                            setNotificationChannels({ ...notificationChannels, push: !!checked })
                          }
                        />
                        <Label htmlFor="push" className="cursor-pointer">
                          Notification Push
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="whatsapp"
                          checked={notificationChannels.whatsapp}
                          onCheckedChange={(checked) =>
                            setNotificationChannels({ ...notificationChannels, whatsapp: !!checked })
                          }
                        />
                        <Label htmlFor="whatsapp" className="cursor-pointer">
                          WhatsApp
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Modèle de message</Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un modèle" />
                      </SelectTrigger>
                      <SelectContent>
                        {messageTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Rédigez votre message..."
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>

                  {notificationMessage && (
                    <Card className="bg-muted">
                      <CardHeader>
                        <CardTitle className="text-sm">Aperçu</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{notificationMessage}</p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleSendNotification} className="flex-1">
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer la notification
                    </Button>
                    <Button variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Prévisualiser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="annonces" className="space-y-4">
              <div className="flex justify-end">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle annonce
                </Button>
              </div>

              <div className="grid gap-4">
                {mockAnnouncements.map((announcement) => (
                  <motion.div
                    key={announcement.id}
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    transition={springPresets.gentle}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle>{announcement.title}</CardTitle>
                            <CardDescription>
                              {formatDateTime(announcement.date)} • {announcement.author}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">{announcement.target}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">{announcement.content}</p>
                        <Separator className="my-4" />
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <span>{announcement.viewCount} vues</span>
                          </div>
                          <Button variant="ghost" size="sm">
                            Voir les détails
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="tickets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tickets et demandes</CardTitle>
                  <CardDescription>
                    Gestion des demandes et du support relationnel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={ticketColumns}
                    data={mockTickets}
                    searchable
                    exportable
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
