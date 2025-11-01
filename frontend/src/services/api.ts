const BASE_URL = 'http://localhost:3000/api';

export async function searchSubscriptions(query: string) {
  const res = await fetch(`${BASE_URL}/subscriptions/search?query=${query}`);
  if (!res.ok) throw new Error('Erreur recherche');
  return res.json();
}

export async function createOrder(orderData: any) {
  const res = await fetch(`${BASE_URL}/orders/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!res.ok) throw new Error('Erreur création commande');
  return res.json();
}

export async function getOrdersByBuyer() {
  // 🔹 Récupérer le numéro de téléphone depuis le localStorage
  const buyerPhone = localStorage.getItem('buyerPhone');

  if (!buyerPhone) {
    throw new Error('Aucun numéro de téléphone trouvé dans le localStorage.');
  }

  const res = await fetch(`${BASE_URL}/orders/buyer/${buyerPhone}`);

  if (!res.ok) {
    throw new Error('Erreur lors de la récupération des commandes.');
  }

  return res.json();
}


export async function confirmOrder(orderId: string) {
  const res = await fetch(`${BASE_URL}/orders/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
  return res.json();
}
