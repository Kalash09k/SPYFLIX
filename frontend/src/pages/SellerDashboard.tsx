import { useEffect, useState } from 'react';

export default function SellerDashboard() {
  const sellerPhone = '+237659212219';
  const [orders, setOrders] = useState<any[]>([]);
  const [wallet, setWallet] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Charger les ventes et le solde
  const fetchData = async () => {
    try {
      const [ordersRes, walletRes] = await Promise.all([
        fetch(`http://localhost:3000/api/orders/seller/${sellerPhone}`),
        fetch(`http://localhost:3000/api/users/wallet/${sellerPhone}`),
      ]);

      const ordersData = await ordersRes.json();
      const walletData = await walletRes.json();

      setOrders(ordersData);
      setWallet(walletData.balance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // actualisation toutes les 5s
    return () => clearInterval(interval);
  }, []);

  const handleWithdraw = async () => {
    if (!withdrawAmount) return alert('Entrez un montant');
    const res = await fetch(`http://localhost:3000/api/users/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: sellerPhone, amount: Number(withdrawAmount) }),
    });
    const data = await res.json();
    alert(data.message);
    setWithdrawAmount('');
    fetchData();
  };

  if (loading) return <div className="p-4 text-center">Chargement...</div>;

  return (
    <div className="p-6 mx-autoa">
      <h1 className="text-4xl font-bold mb-6 text-center">Tableau de bord Proprietaire</h1>

      <div className="flex justify-between items-center mb-6">
        <div className="text-lg font-semibold">
          Solde : <span className="text-green-600">{wallet} XAF</span>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="number"
            placeholder="Montant à retirer"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="border p-2 rounded w-40"/>
          <button
            onClick={handleWithdraw}
            className="bg-blue-600 text-black px-4 py-2 rounded hover:bg-blue-700">Retirer</button>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-2">Historique des ventes</h2>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 border">Service</th>
            <th className="p-2 border">Acheteur</th>
            <th className="p-2 border">Montant</th>
            <th className="p-2 border">Statut</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border">
              <td className="p-2 border">{o.serviceName}</td>
              <td className="p-2 border">{o.buyerPhone}</td>
              <td className="p-2 border">{o.amount} XAF</td>
              <td className="p-2 border">
                <span
                  className={
                    o.status === 'pending'
                      ? 'text-yellow-600'
                      : o.status === 'confirmed'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {o.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
