import { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Mêmes limites que l'API (NestJS et service Python)
const MAX_SUJET = 200;
const MAX_DESCRIPTION = 5000;

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

function App() {
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
      // Appel vers ton orchestrateur NestJS
      const res = await axios.post(`${API_URL}/copilot/ask`, {
        sujet: sujet,
        description: description
      });
      setReponse(res.data.resolution_suggeree);
      setSimulated(res.data.simulated === true);
    } catch (error) {
      console.error(error);
      setErreur(messageErreur(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h2>🛠️ Copilote Support IT - SAP Delivery</h2>
      
      <div style={{ background: '#f4f4f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Nouveau Ticket</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="text" 
            placeholder="Sujet de l'incident (ex: Lenteur système)" 
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
            maxLength={MAX_SUJET}
            required
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <textarea 
            placeholder="Description détaillée du problème..." 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={MAX_DESCRIPTION}
            required
            rows="4"
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '12px', fontSize: '16px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {loading ? 'Analyse de l\'IA en cours...' : 'Générer un Runbook avec l\'IA'}
          </button>
        </form>
      </div>

      {erreur && (
        <div role="alert" style={{ background: '#fdecea', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #c62828' }}>
          <p style={{ margin: 0 }}>{erreur}</p>
        </div>
      )}

      {reponse && (
        <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #1976d2' }}>
          <h3>🤖 Résolution Suggérée :</h3>
          {simulated && (
            <p role="status" style={{ background: '#fff3cd', padding: '8px', borderRadius: '4px' }}>
              ⚠️ Réponse simulée : aucune clé LLM n'est configurée, ce texte est un exemple.
            </p>
          )}
          <p style={{ whiteSpace: 'pre-wrap' }}>{reponse}</p>
        </div>
      )}
    </div>
  );
}

export default App;