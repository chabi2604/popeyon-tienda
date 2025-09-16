import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, writeBatch } from 'firebase/firestore';

// --- ¡IMPORTANTE! ---
// Pega aquí tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBvHbhzTnYJCX7Ti7WhyhFljQ8p6KE4Kgg",
  authDomain: "popeyon-tienda.firebaseapp.com",
  projectId: "popeyon-tienda",
  storageBucket: "popeyon-tienda.firebasestorage.app",
  messagingSenderId: "472510549759",
  appId: "1:472510549759:web:a08d1639a6e5b4ab0b86ca"
};

// --- ¡IMPORTANTE! ---
// Pega aquí el ID de tu carpeta 'artifacts'
const ARTIFACTS_DOCUMENT_ID = 'WkVsarS3pp4gQzoT9ZE1'; // <--- ¡¡¡REEMPLAZA ESTO!!!

function App() {
  const [products, setProducts] = useState(null);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState('store');
  const [db, setDb] = useState(null);

  useEffect(() => {
    try {
      if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "TU_API_KEY") {
        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        setDb(firestoreDb);
      } else {
        console.warn("Firebase config is missing or using placeholder values.");
      }
    } catch (e) { console.error("Error al inicializar Firebase.", e); }
  }, []);

  useEffect(() => {
    if (db) {
      const productsCollectionPath = `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/products`;
      const unsubscribe = onSnapshot(collection(db, productsCollectionPath), (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData.filter(p => p.stock > 0));
      }, (error) => {
          console.error("Error fetching products:", error);
          setProducts([]); // Evita que la app se quede en blanco si hay error
      });
      return () => unsubscribe();
    } else {
        setProducts([]);
    }
  }, [db]);

  const addToCart = (product) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) return currentCart;
        return currentCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };
  
  const updateCartQuantity = (productId, newQuantity) => {
      const productInStore = products.find(p => p.id === productId);
      if (newQuantity > productInStore.stock) return;
      if (newQuantity <= 0) {
          setCart(cart.filter(item => item.id !== productId));
      } else {
          setCart(cart.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
      }
  };
  
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (products === null) {
      return <LoadingScreen />;
  }

  return (
    <div className="bg-gray-900 min-h-screen font-sans text-white antialiased">
        <div className="container mx-auto p-4">
            <Header cartCount={cartItemCount} setView={setView} currentView={view} />
            {view === 'store' && <ProductGrid products={products} addToCart={addToCart} />}
            {view === 'cart' && <CartView cart={cart} updateCartQuantity={updateCartQuantity} setView={setView} />}
            {view === 'checkout' && <CheckoutView cart={cart} db={db} setCart={setCart} setView={setView} />}
        </div>
    </div>
  );
}

const LoadingScreen = () => (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white font-sans">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-400 mb-4"></div>
        <h1 className="text-3xl font-extrabold text-amber-400">Popey<span className="text-white">ón</span></h1>
        <p className="text-slate-400 mt-2">Cargando suplementos...</p>
    </div>
);

const Header = ({ cartCount, setView, currentView }) => (
    <header className="flex justify-between items-center py-4 mb-6 border-b border-white/10">
        <div onClick={() => setView('store')} className="cursor-pointer">
            <h1 className="text-3xl font-extrabold text-amber-400">Popey<span className="text-white">ón</span></h1>
            <p className="text-slate-400">Suplementos para campeones</p>
        </div>
        {currentView !== 'checkout' && (
            <button onClick={() => setView('cart')} className="relative bg-amber-500 text-gray-900 font-bold py-2 px-4 rounded-lg flex items-center transition-transform hover:scale-105">
                🛒 Carrito
                {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {cartCount}
                    </span>
                )}
            </button>
        )}
    </header>
);

const ProductGrid = ({ products, addToCart }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.length === 0 && <p className="col-span-full text-center text-slate-400">No hay productos en el inventario por ahora.</p>}
        {products.map(product => (
            <div key={product.id} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-white/10 flex flex-col group transition-all duration-300 hover:border-amber-500/50 hover:scale-105">
                <div className="aspect-square w-full overflow-hidden">
                    <img src={product.imageUrl || 'https://placehold.co/400x400/2d3748/e2e8f0?text=Popey%C3%B3n'} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div className="p-4 flex flex-col flex-grow">
                    <h2 className="text-lg font-bold text-white truncate flex-grow">{product.name}</h2>
                    <p className="text-slate-400 text-sm capitalize mb-2">{product.category}</p>
                    <div className="flex justify-between items-center mt-auto pt-2">
                        <p className="text-xl font-mono text-amber-400">${product.price ? parseFloat(product.price).toFixed(2) : '0.00'}</p>
                        <button onClick={() => addToCart(product)} className="bg-amber-500 text-gray-900 font-bold text-sm py-1 px-3 rounded-md hover:bg-amber-600 transition-colors">
                            Agregar
                        </button>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const CartView = ({ cart, updateCartQuantity, setView }) => {
    const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    return (
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-white/10 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Tu Carrito</h2>
            {cart.length === 0 ? <p className="text-slate-400">No hay productos en tu carrito.</p> : (
                <div className="space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold">{item.name}</h3>
                                <div className="flex items-center mt-1">
                                    <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className="bg-gray-700 h-6 w-6 rounded">-</button>
                                    <span className="w-10 text-center">{item.quantity}</span>
                                    <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="bg-gray-700 h-6 w-6 rounded">+</button>
                                </div>
                            </div>
                            <p className="font-mono">${((item.price || 0) * item.quantity).toFixed(2)}</p>
                        </div>
                    ))}
                    <div className="border-t border-white/10 pt-4 mt-4 flex justify-between items-center">
                        <p className="text-xl font-bold">TOTAL:</p>
                        <p className="text-2xl font-bold text-amber-400">${total.toFixed(2)}</p>
                    </div>
                    <button onClick={() => setView('checkout')} className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors">
                        Proceder al Pago
                    </button>
                </div>
            )}
        </div>
    );
};

const CheckoutView = ({ cart, db, setCart, setView }) => {
    const [customerData, setCustomerData] = useState({ name: '', phone: '', address: '', city: '', zipCode: '', references: '', coordinates: null });
    const [isLocating, setIsLocating] = useState(false);
    const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const isAddressRequired = customerData.coordinates === null;

    const handleChange = (e) => setCustomerData({ ...customerData, [e.target.name]: e.target.value });

    const handleGetLocation = () => {
        if (!navigator.geolocation) { alert("Tu navegador no soporta la geolocalización."); return; }
        
        setIsLocating(true);

        const options = {
            enableHighAccuracy: true,
            timeout: 10000, // 10 segundos de tiempo de espera
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCustomerData(prevData => ({ ...prevData, coordinates: { lat: latitude, lng: longitude } }));
                setIsLocating(false);
                alert("¡Ubicación capturada! La dirección manual ahora es opcional.");
            },
            (error) => {
                setIsLocating(false);
                let errorMessage = "No se pudo obtener la ubicación. ";
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += "Negaste el permiso. Revisa la configuración de Safari.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += "La información de ubicación no está disponible.";
                        break;
                    case error.TIMEOUT:
                        errorMessage += "La solicitud de ubicación tardó demasiado.";
                        break;
                    default:
                        errorMessage += "Ocurrió un error desconocido.";
                        break;
                }
                alert(errorMessage);
            },
            options
        );
    };

    const handleCheckout = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return;
        if (isAddressRequired && (!customerData.address || !customerData.city || !customerData.zipCode)) {
            alert("Por favor, completa los campos de dirección o usa la ubicación GPS.");
            return;
        }

        const batch = writeBatch(db);
        const orderData = { customer: customerData, items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })), total, status: 'pendiente', createdAt: new Date() };
        const ordersCollectionPath = `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/orders`;
        const newOrderRef = doc(collection(db, ordersCollectionPath));
        batch.set(newOrderRef, orderData);
        cart.forEach(item => {
            const productRef = doc(db, `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/products`, item.id);
            const newStock = item.stock - item.quantity;
            batch.update(productRef, { stock: newStock });
        });
        await batch.commit();
        alert(`¡Gracias por tu compra, ${customerData.name}! Tu pedido ha sido registrado.`);
        setCart([]);
        setView('store');
    };

    return (
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-white/10 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Información de Entrega</h2>
            <form onSubmit={handleCheckout} className="space-y-4" noValidate>
                <button type="button" onClick={handleGetLocation} disabled={isLocating} className="w-full flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition disabled:bg-blue-800 disabled:cursor-wait">
                    📍 {isLocating ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual (Recomendado)'}
                </button>
                {customerData.coordinates && <p className="text-green-400 text-sm text-center">✓ Coordenadas GPS capturadas. La dirección manual es opcional.</p>}
                
                <input type="text" name="name" onChange={handleChange} placeholder="Nombre Completo" className="w-full p-2 bg-gray-700 rounded" required />
                <input type="tel" name="phone" onChange={handleChange} placeholder="Teléfono" className="w-full p-2 bg-gray-700 rounded" required />
                
                <input type="text" name="address" value={customerData.address} onChange={handleChange} placeholder={isAddressRequired ? "Calle y Número (Obligatorio)" : "Calle y Número (Opcional)"} className="w-full p-2 bg-gray-700 rounded" required={isAddressRequired} />
                <input type="text" name="city" value={customerData.city} onChange={handleChange} placeholder={isAddressRequired ? "Colonia y Ciudad (Obligatorio)" : "Colonia y Ciudad (Opcional)"} className="w-full p-2 bg-gray-700 rounded" required={isAddressRequired} />
                <input type="text" name="zipCode" value={customerData.zipCode} onChange={handleChange} placeholder={isAddressRequired ? "Código Postal (Obligatorio)" : "Código Postal (Opcional)"} className="w-full p-2 bg-gray-700 rounded" required={isAddressRequired} />
                
                <textarea name="references" onChange={handleChange} placeholder="Referencias de entrega (ej. fachada azul, dejar en recepción...)" className="w-full p-2 bg-gray-700 rounded h-20"></textarea>
                
                <div className="border-t border-white/10 pt-4 mt-4">
                    <p className="text-2xl font-bold text-amber-400 text-right">Total: ${total.toFixed(2)}</p>
                </div>
                <button type="submit" className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors">
                    Finalizar Compra
                </button>
            </form>
        </div>
    );
};


export default App;

