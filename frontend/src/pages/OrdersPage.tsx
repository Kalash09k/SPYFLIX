import { useEffect, useState } from 'react';
import { confirmOrder } from '../services/api';

export default function OrdersPage() {
  const buyerPhone = '+237659212219';
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fonction pour charger les commandes
  const fetchOrders = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/orders/buyer/${buyerPhone}`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error('Erreur lors du chargement des commandes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchissement automatique toutes les 5 secondes
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirm = async (orderId: string) => {
    if (!window.confirm('Confirmer la réception des identifiants ?')) return;
    const res = await confirmOrder(orderId);
    alert(res.message || 'Commande confirmée');
    fetchOrders(); // recharger après confirmation
  };

  if (loading) return <div className="p-4 text-center">Chargement des commandes...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Mes commandes</h1>

      {orders.length === 0 ? (
        <p className="text-center text-gray-500">Aucune commande pour le moment.</p>) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="p-4 border rounded-lg shadow-sm flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{order.serviceName}</p>
                <p className="text-sm text-gray-500">Vendeur: {order.sellerPhone}</p>
                <p className="text-sm text-gray-500">
                  Statut :{' '}
                  <span
                    className={
                      order.status === 'pending'
                        ? 'text-yellow-600'
                        : order.status === 'confirmed'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {order.status}
                  </span>
                </p>
                <p className="text-sm text-gray-400">
                  Expire le : {new Date(order.expiresAt).toLocaleTimeString()}
                </p>
              </div>

              {order.status === 'pending' && (
                <button
                  onClick={() => handleConfirm(order.id)}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                >
                  Confirmer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
