import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [sujet, setSujet] = useState('');
  const [description, setDescription] = useState('');
  const [reponse, setReponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setReponse(null);

    try {
      // Appel vers ton orchestrateur NestJS
      const res = await axios.post('http://localhost:3000/copilot/ask', {
        sujet: sujet,
        description: description
      });
      setReponse(res.data.resolution_suggeree);
    } catch (error) {
      console.error(error);
      setReponse("Erreur lors de la communication avec le serveur.");
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
            required
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <textarea 
            placeholder="Description détaillée du problème..." 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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

      {reponse && (
        <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #1976d2' }}>
          <h3>🤖 Résolution Suggérée :</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{reponse}</p>
        </div>
      )}
    </div>
  );
}

export default App;