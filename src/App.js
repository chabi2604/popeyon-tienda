import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, writeBatch } from 'firebase/firestore';

// Pega aquí tu configuración de Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY", // Reemplaza esto con tus valores reales
  authDomain: "popeyon-tienda.firebaseapp.com",
  projectId: "popeyon-tienda",
  storageBucket: "popeyon-tienda.appspot.com",
  messagingSenderId: "TUS_DATOS",
  appId: "TUS_DATOS"
};

// --- LA CORRECCIÓN MÁS IMPORTANTE ESTÁ AQUÍ ---
// Pega aquí el ID raro que copiaste de la carpeta 'artifacts'
const ARTIFACTS_DOCUMENT_ID = 'WkVsarS3pp4gQzoT9ZE1'; // <--- ¡¡¡REEMPLAZA ESTO!!!

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState('store'); 
  const [db, setDb] = useState(null);

  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      setDb(firestoreDb);
    } catch (e) {
      console.error("Error al inicializar Firebase.", e);
    }
  }, []);

  useEffect(() => {
    if (db) {
      // Usamos la dirección REAL que acabamos de definir
      const productsCollectionPath = `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/products`; 
      
      const unsubscribe = onSnapshot(collection(db, productsCollectionPath), (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData.filter(p => p.stock > 0));
      });

      return () => unsubscribe();
    }
  }, [db]);


  const addToCart = (product) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) return currentCart;
        return currentCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="bg-gray-900 min-h-screen font-sans text-white antialiased">
        <div className="container mx-auto p-4">
            <Header cartCount={cart.length} setView={setView} />
            {view === 'store' && <ProductGrid products={products} addToCart={addToCart} />}
            {view === 'cart' && <CartView cart={cart} setCart={setCart} total={total} db={db} />}
        </div>
    </div>
  );
}

const Header = ({ cartCount, setView }) => (
    <header className="flex justify-between items-center py-4 mb-6 border-b border-white/10">
        <div>
            <h1 className="text-3xl font-extrabold text-amber-400">Popey<span className="text-white">ón</span></h1>
            <p className="text-slate-400">Suplementos para campeones</p>
        </div>
        <button onClick={() => setView('cart')} className="relative bg-amber-500 text-gray-900 font-bold py-2 px-4 rounded-lg flex items-center transition-transform hover:scale-105">
            🛒 Carrito
            {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                </span>
            )}
        </button>
    </header>
);

const ProductGrid = ({ products, addToCart }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.length === 0 && <p className="col-span-full text-center text-slate-400">Conectando con el inventario...</p>}
        {products.map(product => (
            <div key={product.id} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-white/10 flex flex-col justify-between transition-transform hover:-translate-y-1">
                <div className="p-4">
                    <h2 className="text-lg font-bold text-white truncate">{product.name}</h2>
                    <p className="text-slate-400 text-sm capitalize">{product.category}</p>
                </div>
                <div className="p-4 bg-black/20 flex justify-between items-center">
                    <p className="text-xl font-mono text-amber-400">${parseFloat(product.price).toFixed(2)}</p>
                    <button onClick={() => addToCart(product)} className="bg-amber-500 text-gray-900 font-bold text-sm py-1 px-3 rounded-md hover:bg-amber-600 transition-colors">
                        Agregar
                    </button>
                </div>
            </div>
        ))}
    </div>
);

const CartView = ({ cart, setCart, total, db }) => {
    const handleCheckout = async () => {
        const customerName = prompt("Por favor, ingresa tu nombre para el pedido:");
        if (!customerName || cart.length === 0) return;

        const batch = writeBatch(db);
        const orderData = {
            customerName,
            items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
            total,
            status: 'pendiente',
            createdAt: new Date(),
        };

        const ordersCollectionPath = `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/orders`;
        const newOrderRef = doc(collection(db, ordersCollectionPath));
        batch.set(newOrderRef, orderData);

        cart.forEach(item => {
            const productRef = doc(db, `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/products`, item.id);
            const newStock = item.stock - item.quantity;
            batch.update(productRef, { stock: newStock });
        });

        await batch.commit();
        alert(`¡Gracias por tu compra, ${customerName}! Tu pedido ha sido registrado.`);
        setCart([]);
    };
    
    return (
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-white/10 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Tu Carrito</h2>
            {cart.length === 0 ? <p className="text-slate-400">No hay productos en tu carrito.</p> : (
                <div className="space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold">{item.name}</h3>
                                <p className="text-sm text-slate-400">Cantidad: {item.quantity}</p>
                            </div>
                            <p className="font-mono">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                    ))}
                    <div className="border-t border-white/10 pt-4 mt-4 flex justify-between items-center">
                        <p className="text-xl font-bold">TOTAL:</p>
                        <p className="text-2xl font-bold text-amber-400">${total.toFixed(2)}</p>
                    </div>
                    <button onClick={handleCheckout} className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors">
                        Finalizar Compra
                    </button>
                </div>
            )}
        </div>
    );
};

export default App;

