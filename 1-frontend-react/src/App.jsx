import { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Mêmes limites que l'API (NestJS et service Python)
const MAX_SUJET = 200;
const MAX_DESCRIPTION = 5000;
// bcrypt ignore les octets au-delà du 72e : l'API refuse plus long.
const MAX_MOT_DE_PASSE = 72;
const MAX_IDENTIFIANT = 64;

// sessionStorage et non localStorage : le jeton disparaît à la fermeture de
// l'onglet, ce qui limite la fenêtre d'exploitation s'il fuit.
const CLE_JETON = 'copilote.jeton';

function messageErreur(error) {
  switch (error.response?.status) {
    case undefined:
      return "Impossible de joindre le serveur.";
    case 400:
      return `Sujet (${MAX_SUJET} caractères max.) ou description (${MAX_DESCRIPTION} max.) invalide.`;
    case 429:
      return "Trop de demandes : réessayez dans une minute.";
    case 503:
      return "Le service IA n'est pas disponible pour le moment.";
    case 504:
      return "Le service IA met trop de temps à répondre.";
    default:
      return "Erreur lors de la communication avec le serveur.";
  }
}

function messageErreurConnexion(error) {
  switch (error.response?.status) {
    case undefined:
      return "Impossible de joindre le serveur.";
    case 400:
      return "Identifiant ou mot de passe manquant, ou trop long.";
    case 401:
      return "Identifiants invalides.";
    case 429:
      return "Trop de tentatives de connexion : réessayez dans un quart d'heure.";
    default:
      return "Erreur lors de la connexion.";
  }
}

const styleChamp = { padding: '10px', fontSize: '16px' };

const styleBouton = {
  padding: '12px',
  fontSize: '16px',
  background: '#0056b3',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const styleEncart = {
  background: '#f4f4f9',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px',
};

function Alerte({ children }) {
  return (
    <div
      role="alert"
      style={{
        background: '#fdecea',
        padding: '20px',
        borderRadius: '8px',
        borderLeft: '5px solid #c62828',
        marginBottom: '20px',
      }}
    >
      <p style={{ margin: 0 }}>{children}</p>
    </div>
  );
}

function Connexion({ onConnecte, messageInitial }) {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState(messageInitial ?? null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        identifiant,
        mot_de_passe: motDePasse,
      });
      onConnecte(res.data.access_token);
    } catch (error) {
      setErreur(messageErreurConnexion(error));
    } finally {
      // Le mot de passe ne reste pas en mémoire après la tentative.
      setMotDePasse('');
      setLoading(false);
    }
  };

  return (
    <div style={styleEncart}>
      <h3 style={{ marginTop: 0 }}>Connexion</h3>
      <p style={{ color: '#555' }}>
        L&apos;accès au copilote est réservé aux techniciens du support.
      </p>
      {erreur && <Alerte>{erreur}</Alerte>}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
      >
        <input
          type="text"
          placeholder="Identifiant"
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
          maxLength={MAX_IDENTIFIANT}
          autoComplete="username"
          required
          style={styleChamp}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          maxLength={MAX_MOT_DE_PASSE}
          autoComplete="current-password"
          required
          style={styleChamp}
        />
        <button type="submit" disabled={loading} style={styleBouton}>
          {loading ? 'Connexion en cours...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}

function Copilote({ jeton, onSessionExpiree, onDeconnexion }) {
  const [sujet, setSujet] = useState('');
  const [description, setDescription] = useState('');
  const [reponse, setReponse] = useState(null);
  const [simulated, setSimulated] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setReponse(null);
    setSimulated(false);
    setErreur(null);

    try {
      const res = await axios.post(
        `${API_URL}/copilot/ask`,
        { sujet: sujet, description: description },
        { headers: { Authorization: `Bearer ${jeton}` } },
      );
      setReponse(res.data.resolution_suggeree);
      setSimulated(res.data.simulated === true);
    } catch (error) {
      // 401 : jeton expiré ou révoqué. On repasse par l'écran de connexion
      // plutôt que d'afficher une erreur sur laquelle on ne peut rien faire.
      if (error.response?.status === 401) {
        onSessionExpiree();
        return;
      }
      console.error(error);
      setErreur(messageErreur(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={styleEncart}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0 }}>Nouveau Ticket</h3>
          <button
            type="button"
            onClick={onDeconnexion}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              background: 'transparent',
              color: '#0056b3',
              border: '1px solid #0056b3',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Se déconnecter
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            marginTop: '15px',
          }}
        >
          <input
            type="text"
            placeholder="Sujet de l'incident (ex: Lenteur système)"
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
            maxLength={MAX_SUJET}
            required
            style={styleChamp}
          />
          <textarea
            placeholder="Description détaillée du problème..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={MAX_DESCRIPTION}
            required
            rows="4"
            style={styleChamp}
          />
          <button type="submit" disabled={loading} style={styleBouton}>
            {loading
              ? "Analyse de l'IA en cours..."
              : 'Générer un Runbook avec l’IA'}
          </button>
        </form>
      </div>

      {erreur && <Alerte>{erreur}</Alerte>}

      {reponse && (
        <div
          style={{
            background: '#e3f2fd',
            padding: '20px',
            borderRadius: '8px',
            borderLeft: '5px solid #1976d2',
          }}
        >
          <h3>🤖 Résolution Suggérée :</h3>
          {simulated && (
            <p
              role="status"
              style={{
                background: '#fff3cd',
                padding: '8px',
                borderRadius: '4px',
              }}
            >
              ⚠️ Réponse simulée : aucune clé LLM n&apos;est configurée, ce
              texte est un exemple.
            </p>
          )}
          <p style={{ whiteSpace: 'pre-wrap' }}>{reponse}</p>
        </div>
      )}
    </>
  );
}

function App() {
  const [jeton, setJeton] = useState(() => sessionStorage.getItem(CLE_JETON));
  const [messageConnexion, setMessageConnexion] = useState(null);

  const connecter = (nouveauJeton) => {
    sessionStorage.setItem(CLE_JETON, nouveauJeton);
    setMessageConnexion(null);
    setJeton(nouveauJeton);
  };

  const oublierJeton = (message) => {
    sessionStorage.removeItem(CLE_JETON);
    setMessageConnexion(message ?? null);
    setJeton(null);
  };

  return (
    <div
      style={{
        padding: '40px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: 'auto',
      }}
    >
      <h2>🛠️ Copilote Support IT - SAP Delivery</h2>

      {jeton ? (
        <Copilote
          jeton={jeton}
          onSessionExpiree={() =>
            oublierJeton('Votre session a expiré : reconnectez-vous.')
          }
          onDeconnexion={() => oublierJeton()}
        />
      ) : (
        <Connexion onConnecte={connecter} messageInitial={messageConnexion} />
      )}
    </div>
  );
}

export default App;
