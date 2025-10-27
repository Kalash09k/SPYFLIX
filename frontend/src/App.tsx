import { useState } from 'react';
import { searchSubscriptions, createOrder } from './services/api';

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    const res = await searchSubscriptions(query);
    setResults(res);
  };

  const handleBuy = async (service: any) => {
    const order = await createOrder({
      buyerPhone: '+237659212219',
      sellerPhone: service.sellerPhone,
      serviceName: service.name,
      amount: service.price,
    });
    window.location.href = order.paymentUrl; // redirection paiement CinetPay
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Rechercher un abonnement</h1>
      <input
        type="text"
        placeholder="Netflix, Spotify, PrimeVideo..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border p-2 rounded mr-2"
      />
      <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-2 rounded">Rechercher</button>

      <ul className="mt-4">
        {results.map((service) => (
          <li key={service.id} className="border p-2 rounded mb-2 flex justify-between items-center">
            <div>
              {service.name} - {service.plan} - {service.price} XAF
            </div>
            <button onClick={() => handleBuy(service)} className="bg-green-500 text-white px-3 py-1 rounded">
              Acheter
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
