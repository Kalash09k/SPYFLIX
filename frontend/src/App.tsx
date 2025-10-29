import { useState } from 'react';
import { searchSubscriptions, createOrder } from './services/api';

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchSubscriptions(query);
      setResults(res);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (service: any) => {
    try {
      const order = await createOrder({
        subscriptionGroupId: service.groupId, 
        subscriptionId: service.id,           
        buyerId: 'USER_ID_DE_TEST',           
        buyerWhatsApp: '+237659212219',
        amount: service.price,
      });
      window.location.href = order.paymentUrl; // redirection vers CinetPay
    } catch (err) {
      console.error('Erreur création commande :', err);
      alert('Impossible de créer la commande.');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Rechercher un abonnement</h1>
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Netflix, Spotify, PrimeVideo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border p-2 rounded-l grow"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-500 text-white px-4 py-2 rounded-r"
          disabled={loading}
        >
          {loading ? 'Recherche...' : 'Rechercher'}
        </button>
      </div>

      {results.length === 0 && !loading && (
        <p className="text-gray-500">Aucun abonnement trouvé.</p>
      )}

      <ul className="mt-4">
        {results.map((service) => (
          <li key={service.id} className="border p-2 rounded mb-2 flex justify-between items-center">
            <div>
              <strong>{service.name}</strong> - {service.plan} - {service.price} XAF
            </div>
            <button
              onClick={() => handleBuy(service)}
              className="bg-green-500 text-white px-3 py-1 rounded"
            >
              Acheter
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}