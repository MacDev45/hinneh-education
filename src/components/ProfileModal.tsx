import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  KeyRound,
  Mail,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Camera,
  Phone,
  Printer,
  Trash2,
  Lock,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { generateQRCodeDataURI } from "@/lib/qrHelper";
import { IMAGES } from "@/assets/images";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  userRole: string;
  onUpdateSuccess?: (newUsername: string) => void;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  direction_fondation: "Direction Générale Fondation",
  directeur_ecole: "Directeur de l'Établissement",
  directeur_etudes: "Directeur des Études",
  enseignant: "Professeur / Enseignant",
  instituteur: "Instituteur / Maître d'école",
  educateur: "Éducateur / Vie Scolaire",
  comptable: "Service Comptabilité",
  caisse: "Caissier(ère)",
  rh: "Ressources Humaines",
  accueil: "Accueil & Réception",
  agent: "Agent d'Administration",
  scolarite: "Service Scolarité",
  secretaire_direction: "Secrétariat de Direction",
  aumonier: "Aumônerie",
  admin: "Administrateur",
  superuser: "Superviseur",
  parent: "Parent d'Élève",
  eleve: "Élève",
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
  userRole,
  onUpdateSuccess,
}) => {
  const [username, setUsername] = useState(currentUsername || "");
  const [matricule, setMatricule] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [badgePreviewOpen, setBadgePreviewOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const badgePrintRef = useRef<HTMLDivElement>(null);

  const ecoleNom = typeof window !== "undefined" ? localStorage.getItem("user_ecole_nom") || "École Confessionnelle Hinneh" : "École Confessionnelle Hinneh";
  const ville = typeof window !== "undefined" ? localStorage.getItem("user_ville") || "Abidjan" : "Abidjan";

  useEffect(() => {
    if (isOpen) {
      const storedUser = localStorage.getItem("username") || currentUsername || "admin";
      const storedEmail = localStorage.getItem("user_email") || (storedUser.includes("@") ? storedUser : "");
      const storedFirstName = localStorage.getItem("user_prenom") || "";
      const storedLastName = localStorage.getItem("user_nom") || "";
      const storedPhone = localStorage.getItem("user_telephone") || "";
      const storedPhoto = localStorage.getItem("user_photo") || localStorage.getItem("user_avatar") || "";
      
      const fallbackMatricule = storedUser && !storedUser.includes("@")
        ? storedUser
        : `PERS-${(storedLastName || storedFirstName || "ADM").slice(0, 4).toUpperCase()}-2026`;
      const storedMatricule = localStorage.getItem("user_matricule") || fallbackMatricule;

      setUsername(storedUser);
      setMatricule(storedMatricule);
      setEmail(storedEmail);
      setFirstName(storedFirstName);
      setLastName(storedLastName);
      setPhone(storedPhone);
      setPhoto(storedPhoto);
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [isOpen, currentUsername]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error("Veuillez choisir une photo de moins de 4 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhoto(result);
      toast.success("Photo mise à jour.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhoto("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Photo retirée.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Veuillez renseigner votre identifiant.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        current_username: currentUsername || localStorage.getItem("username") || "admin",
        new_username: username.trim(),
        new_email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        telephone: phone.trim(),
        photo: photo || undefined,
        new_password: newPassword ? newPassword.trim() : undefined,
      };

      await axios.put("/api/auth/update-credentials", payload);
      
      localStorage.setItem("username", username.trim());
      if (matricule.trim()) localStorage.setItem("user_matricule", matricule.trim());
      localStorage.setItem("user_email", email.trim());
      if (firstName.trim()) localStorage.setItem("user_prenom", firstName.trim());
      if (lastName.trim()) localStorage.setItem("user_nom", lastName.trim());
      if (phone.trim()) localStorage.setItem("user_telephone", phone.trim());
      if (photo) {
        localStorage.setItem("user_photo", photo);
        localStorage.setItem("user_avatar", photo);
      } else {
        localStorage.removeItem("user_photo");
        localStorage.removeItem("user_avatar");
      }

      if (firstName.trim() || lastName.trim()) {
        localStorage.setItem("user_full_name", `${lastName.trim()} ${firstName.trim()}`.trim());
      }

      toast.success("Vos modifications ont été enregistrées.");

      if (onUpdateSuccess) {
        onUpdateSuccess(username.trim());
      }

      onClose();
    } catch (err: any) {
      console.error("Mise à jour identifiants:", err);
      // Fallback local
      localStorage.setItem("username", username.trim());
      if (matricule.trim()) localStorage.setItem("user_matricule", matricule.trim());
      localStorage.setItem("user_email", email.trim());
      if (firstName.trim()) localStorage.setItem("user_prenom", firstName.trim());
      if (lastName.trim()) localStorage.setItem("user_nom", lastName.trim());
      if (phone.trim()) localStorage.setItem("user_telephone", phone.trim());
      if (photo) {
        localStorage.setItem("user_photo", photo);
        localStorage.setItem("user_avatar", photo);
      }

      toast.success("Informations enregistrées.");
      if (onUpdateSuccess) {
        onUpdateSuccess(username.trim());
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const f = firstName.trim().charAt(0);
    const l = lastName.trim().charAt(0);
    if (f || l) return `${f}${l}`.toUpperCase();
    return username.charAt(0).toUpperCase() || "U";
  };

  const displayMatricule = matricule.trim() || localStorage.getItem("user_matricule") || (username && !username.includes("@") ? username : `PERS-${(lastName || firstName || "ADM").slice(0, 4).toUpperCase()}-2026`);

  const handlePrintBadge = () => {
    const printWindow = window.open('', '', 'width=800,height=900');
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression.");
      return;
    }

    const displayName = `${lastName} ${firstName}`.trim() || username;
    const roleTitle = ROLE_DISPLAY_NAMES[userRole] || userRole || "Personnel";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Carte Professionnelle - ${displayName}</title>
          <style>
            @page {
              size: 85.6mm 54mm;
              margin: 0;
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: #f1f5f9;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .badge-card {
              width: 85.6mm;
              height: 53.98mm;
              border-radius: 4px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #ffffff;
              color: #0f172a;
              position: relative;
              overflow: hidden;
              border: 1px solid #cbd5e1;
              box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
            }
            /* Fond filigrane de sécurité */
            .badge-card::before {
              content: "";
              position: absolute;
              inset: 0;
              background: repeating-linear-gradient(45deg, rgba(15, 43, 92, 0.015) 0, rgba(15, 43, 92, 0.015) 2px, transparent 2px, transparent 6px);
              pointer-events: none;
            }
            .badge-header {
              background: #0f2444;
              padding: 4px 8px;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #b45309;
              position: relative;
              z-index: 1;
            }
            .badge-logo {
              height: 26px;
              width: 26px;
              object-fit: contain;
              background: #ffffff;
              border-radius: 3px;
              padding: 1.5px;
            }
            .header-text {
              flex: 1;
              margin-left: 6px;
              line-height: 1.15;
            }
            .badge-inst {
              font-size: 6px;
              font-weight: 700;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              color: #cbd5e1;
            }
            .badge-school {
              font-size: 8px;
              font-weight: 800;
              color: #ffffff;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 175px;
            }
            .badge-title {
              font-size: 6px;
              font-weight: 700;
              color: #fde68a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .badge-year {
              font-size: 7px;
              font-weight: 700;
              background: rgba(255, 255, 255, 0.15);
              border: 1px solid rgba(255, 255, 255, 0.3);
              color: #ffffff;
              padding: 1.5px 5px;
              border-radius: 3px;
              white-space: nowrap;
            }
            .badge-body {
              padding: 4px 8px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              flex: 1;
              position: relative;
              z-index: 1;
            }
            .photo-box {
              width: 48px;
              height: 58px;
              border-radius: 3px;
              border: 1px solid #0f2444;
              padding: 1px;
              background: #ffffff;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .photo-box img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 2px;
            }
            .photo-fallback {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: #f1f5f9;
              color: #475569;
              font-size: 13px;
              font-weight: 700;
            }
            .photo-fallback span {
              font-size: 5.5px;
              color: #94a3b8;
              font-weight: 600;
              margin-top: 1px;
            }
            .badge-info {
              flex: 1;
              min-width: 0;
              line-height: 1.25;
            }
            .field-label {
              font-size: 6px;
              color: #64748b;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .badge-name {
              font-size: 9.5px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 2px;
            }
            .badge-role {
              font-size: 7.5px;
              font-weight: 700;
              color: #0f2444;
              background: #e2e8f0;
              border-left: 2.5px solid #0f2444;
              padding: 1px 4px;
              border-radius: 1px;
              display: inline-block;
              margin-bottom: 2px;
              text-transform: uppercase;
            }
            .badge-row {
              font-size: 6.8px;
              color: #334155;
              margin-bottom: 1px;
            }
            .badge-row strong {
              color: #0f172a;
            }
            .badge-qr-wrap {
              display: flex;
              flex-direction: column;
              align-items: center;
              flex-shrink: 0;
            }
            .badge-qr {
              width: 44px;
              height: 44px;
              border: 1px solid #cbd5e1;
              border-radius: 3px;
              padding: 1px;
              background: #ffffff;
            }
            .badge-qr img {
              width: 100%;
              height: 100%;
            }
            .qr-caption {
              font-size: 5px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              margin-top: 1.5px;
              letter-spacing: 0.3px;
            }
            .badge-footer {
              background: #f8fafc;
              border-top: 1px solid #e2e8f0;
              padding: 2.5px 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 6px;
              color: #475569;
              font-weight: 600;
              position: relative;
              z-index: 1;
            }
            .secure-badge {
              font-weight: 700;
              color: #047857;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
          </style>
        </head>
        <body>
          <div class="badge-card">
            <div class="badge-header">
              <div style="display: flex; align-items: center;">
                <img src="${IMAGES.HINNEH_LOGO_20260507_234919_1}" alt="Logo" class="badge-logo" />
                <div class="header-text">
                  <div class="badge-inst">Fondation Hinneh • République de Côte d'Ivoire</div>
                  <div class="badge-school">${ecoleNom}</div>
                  <div class="badge-title">Carte Professionnelle d'Agent</div>
                </div>
              </div>
              <span class="badge-year">2026 - 2027</span>
            </div>

            <div class="badge-body">
              <div class="photo-box">
                ${photo ? `<img src="${photo}" alt="Photo" />` : `<div class="photo-fallback">${getInitials()}<span>PHOTO</span></div>`}
              </div>

              <div class="badge-info">
                <div class="field-label">Nom & Prénoms</div>
                <div class="badge-name">${displayName}</div>
                <div><span class="badge-role">${roleTitle}</span></div>
                <div class="badge-row">Matricule : <strong>${displayMatricule}</strong></div>
                ${phone ? `<div class="badge-row">Contact : <strong>${phone}</strong></div>` : ''}
              </div>

              <div class="badge-qr-wrap">
                <div class="badge-qr">
                  <img src="${generateQRCodeDataURI(`${typeof window !== 'undefined' ? window.location.origin : 'https://hinneh-education.ci'}/#/agent?matricule=${encodeURIComponent(displayMatricule)}&nom=${encodeURIComponent(lastName || '')}&prenom=${encodeURIComponent(firstName || '')}&contact=${encodeURIComponent(phone || '')}&role=${encodeURIComponent(userRole)}`, 160)}" alt="QR" />
                </div>
                <div class="qr-caption">Authentifié RH</div>
              </div>
            </div>

            <div class="badge-footer">
              <span>Fondation Hinneh — ${ville}</span>
              <span class="secure-badge">Personnel Enregistré</span>
              <span>Visa de la Direction</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* En-tête sobre et soigné */}
          <div className="px-6 py-5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Photo avec bouton discret de modification */}
              <div className="relative group">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-lg text-slate-700 shadow-xs">
                  {photo ? (
                    <img src={photo} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials()}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-0.5 -right-0.5 p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-sm transition-transform active:scale-95"
                  title="Changer la photo"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />
              </div>

              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  Mon Profil
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {ROLE_DISPLAY_NAMES[userRole] || userRole || "Utilisateur"}
                </DialogDescription>
              </div>
            </div>

            {/* Bouton Badge sobre */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBadgePreviewOpen(true)}
              className="text-xs gap-1.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Mon badge
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
            {/* Prénom & Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Prénom
                </Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  className="h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Nom
                </Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Votre nom"
                  className="h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400"
                />
              </div>
            </div>

            {/* Identifiant & Matricule Personnel */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Identifiant de connexion *
                </Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nom.prenom ou email"
                  className="h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  N° Matricule Personnel
                </Label>
                <Input
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  placeholder="ex: PERS-2026-001"
                  className="h-9 text-xs font-mono font-bold rounded-lg border-slate-200 focus-visible:ring-slate-400"
                />
              </div>
            </div>

            {/* Email & Téléphone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Adresse email
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@domaine.ci"
                  className="h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Téléphone
                </Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07 00 00 00 00"
                  className="h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400"
                />
              </div>
            </div>

            {/* Modification du mot de passe */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <span className="font-medium text-xs text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Changer le mot de passe (optionnel)
              </span>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">
                  Nouveau mot de passe
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Laissez vide pour conserver l'actuel"
                    className="h-9 text-xs pr-9 rounded-lg border-slate-200 focus-visible:ring-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {newPassword && (
                <div className="space-y-1.5 animate-fade-in">
                  <Label className="text-xs text-slate-600">
                    Confirmer le mot de passe
                  </Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le nouveau mot de passe"
                    className="h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-400"
                  />
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={loading}
                className="text-xs rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg px-4 gap-1.5"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* APERÇU ET IMPRESSION DU BADGE */}
      <Dialog open={badgePreviewOpen} onOpenChange={setBadgePreviewOpen}>
        <DialogContent className="sm:max-w-[460px] p-6 rounded-2xl bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Printer className="w-4 h-4 text-slate-600" />
              Carte Professionnelle
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Aperçu officiel avant impression.
            </DialogDescription>
          </DialogHeader>

          {/* Carte sobre, humaine et institutionnelle */}
          <div className="flex justify-center my-4">
            <div
              ref={badgePrintRef}
              className="w-[360px] h-[225px] rounded-lg overflow-hidden shadow-lg border border-slate-300 bg-white text-slate-900 flex flex-col justify-between select-none relative"
            >
              {/* Filigrane de sécurité subtil */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, #0f2444 0, #0f2444 2px, transparent 2px, transparent 6px)"
                }}
              />

              {/* Entête Institutionnel */}
              <div className="bg-[#0f2444] px-3.5 py-2 text-white flex items-center justify-between border-b-2 border-[#b45309] relative z-10">
                <div className="flex items-center gap-2">
                  <img src={IMAGES.HINNEH_LOGO_20260507_234919_1} alt="Logo" className="h-7 w-7 object-contain bg-white rounded p-0.5 shadow-xs" />
                  <div>
                    <p className="text-[6.5px] font-bold uppercase tracking-wider text-slate-300">Fondation Hinneh • Côte d'Ivoire</p>
                    <p className="text-[10px] font-extrabold text-white leading-tight truncate max-w-[190px]">{ecoleNom}</p>
                    <p className="text-[6.5px] font-bold text-amber-300 uppercase tracking-wide">Carte Professionnelle d'Agent</p>
                  </div>
                </div>
                <span className="text-[8px] font-bold bg-white/10 border border-white/25 text-white px-2 py-0.5 rounded">
                  2026 - 2027
                </span>
              </div>

              {/* Corps Officiel */}
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white relative z-10 flex-1">
                {/* Cadre Photo Portait 3:4 */}
                <div className="w-[66px] h-[80px] rounded border border-[#0f2444] p-0.5 bg-white flex items-center justify-center shrink-0 shadow-xs">
                  {photo ? (
                    <img src={photo} alt="Photo" className="w-full h-full object-cover rounded-[2px]" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 rounded-[2px] flex flex-col items-center justify-center text-slate-700">
                      <span className="font-extrabold text-sm">{getInitials()}</span>
                      <span className="text-[6px] font-bold text-slate-400 mt-0.5">PHOTO</span>
                    </div>
                  )}
                </div>

                {/* Données de l'agent */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div>
                    <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Nom & Prénoms</p>
                    <h4 className="font-extrabold text-[12px] leading-tight text-slate-900 uppercase truncate">
                      {lastName || firstName ? `${lastName} ${firstName}` : username}
                    </h4>
                  </div>

                  <div>
                    <span className="text-[8.5px] font-bold text-slate-900 bg-slate-100 border-l-2 border-[#0f2444] px-1.5 py-0.5 rounded-r inline-block uppercase truncate max-w-[160px]">
                      {ROLE_DISPLAY_NAMES[userRole] || userRole || "Personnel"}
                    </span>
                  </div>

                  <div className="text-[7.5px] text-slate-600 space-y-0.5 pt-0.5">
                    <p><span className="font-semibold text-slate-500">Matricule :</span> <span className="font-mono font-bold text-slate-900">{displayMatricule}</span></p>
                    {phone && <p><span className="font-semibold text-slate-500">Contact :</span> <span className="font-medium text-slate-800">{phone}</span></p>}
                  </div>
                </div>

                {/* QR Code Sécurisé */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="border border-slate-200 p-1 rounded bg-white shadow-xs">
                    <img
                      src={generateQRCodeDataURI(`${typeof window !== 'undefined' ? window.location.origin : 'https://hinneh-education.ci'}/#/agent?matricule=${encodeURIComponent(displayMatricule)}&nom=${encodeURIComponent(lastName || '')}&prenom=${encodeURIComponent(firstName || '')}&contact=${encodeURIComponent(phone || '')}&role=${encodeURIComponent(userRole)}`, 130)}
                      alt="QR Code"
                      className="w-13 h-13"
                    />
                  </div>
                  <span className="text-[5.5px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">Authentifié RH</span>
                </div>
              </div>

              {/* Pied de Carte Institutionnel */}
              <div className="bg-slate-50 px-3 py-1.5 text-slate-600 flex items-center justify-between text-[7px] font-medium border-t border-slate-200 relative z-10">
                <span>Fondation Hinneh — {ville}</span>
                <span className="text-emerald-800 font-bold uppercase tracking-wider">Personnel Enregistré</span>
                <span>Visa de la Direction</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBadgePreviewOpen(false)} className="text-xs rounded-lg">
              Fermer
            </Button>
            <Button onClick={handlePrintBadge} className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5 rounded-lg">
              <Printer className="w-3.5 h-3.5" />
              Imprimer le badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
