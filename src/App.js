import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, writeBatch } from 'firebase/firestore';

// --- ¡IMPORTANTE! ---
// Pega aquí tu configuración de Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "popeyon-tienda.firebaseapp.com",
    projectId: "popeyon-tienda",
    storageBucket: "popeyon-tienda.appspot.com",
    messagingSenderId: "TUS_DATOS",
    appId: "TUS_DATOS"
};

// --- ¡IMPORTANTE! ---
// Pega aquí el ID de tu carpeta 'artifacts'
const ARTIFACTS_DOCUMENT_ID = 'WkVsarS3pp4gQzoT9ZE1'; // <--- ¡¡¡REEMPLAZA ESTO!!!

function App() {
  // ... (código de App sin cambios) ...
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState('store');
  const [db, setDb] = useState(null);

    useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      setDb(firestoreDb);
    } catch (e) { console.error("Error al inicializar Firebase.", e); }
  }, []);

  useEffect(() => {
    if (db) {
      const productsCollectionPath = `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/products`;
      const unsubscribe = onSnapshot(collection(db, productsCollectionPath), (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData.filter(p => p.stock > 0));
      });
      return () => unsubscribe();
    }
  }, [db]);


  const addToCart = (product) => { /* ... (código sin cambios) ... */ };
  const updateCartQuantity = (productId, newQuantity) => { /* ... (código sin cambios) ... */ };
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

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

const Header = ({/* ... (código sin cambios) ... */});
const ProductGrid = ({/* ... (código sin cambios) ... */});
const CartView = ({/* ... (código sin cambios) ... */});

const CheckoutView = ({ cart, db, setCart, setView }) => {
    const [customerData, setCustomerData] = useState({ 
        name: '', phone: '', address: '', city: '', zipCode: '', 
        references: '',
        coordinates: null 
    });
    const [isLocating, setIsLocating] = useState(false);
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // --- ¡LA MEJORA ESTÁ AQUÍ! ---
    // La dirección manual solo es requerida si NO tenemos coordenadas GPS.
    const isAddressRequired = customerData.coordinates === null;

    const handleChange = (e) => setCustomerData({ ...customerData, [e.target.name]: e.target.value });

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Tu navegador no soporta la geolocalización.");
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCustomerData(prevData => ({
                    ...prevData,
                    coordinates: { lat: latitude, lng: longitude }
                }));
                setIsLocating(false);
                alert("¡Ubicación capturada! La dirección manual ahora es opcional.");
            },
            () => {
                setIsLocating(false);
                alert("No se pudo obtener la ubicación. Asegúrate de haber dado permiso en el navegador.");
            }
        );
    };

    const handleCheckout = async (e) => { /* ... (código sin cambios) ... */ };

    return (
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-white/10 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Información de Entrega</h2>
            <form onSubmit={handleCheckout} className="space-y-4">
                <button type="button" onClick={handleGetLocation} disabled={isLocating} className="w-full flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition disabled:bg-blue-800 disabled:cursor-wait">
                    📍 {isLocating ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual (Recomendado)'}
                </button>
                {customerData.coordinates && <p className="text-green-400 text-sm text-center">✓ Coordenadas GPS capturadas. La dirección manual es opcional.</p>}

                <input type="text" name="name" onChange={handleChange} placeholder="Nombre Completo" className="w-full p-2 bg-gray-700 rounded" required />
                <input type="tel" name="phone" onChange={handleChange} placeholder="Teléfono" className="w-full p-2 bg-gray-700 rounded" required />
                
                {/* --- ¡CAMPOS INTELIGENTES! --- */}
                <input type="text" name="address" onChange={handleChange} placeholder={isAddressRequired ? "Calle y Número" : "Calle y Número (Opcional)"} className="w-full p-2 bg-gray-700 rounded" required={isAddressRequired} />
                <input type="text" name="city" onChange={handleChange} placeholder={isAddressRequired ? "Colonia y Ciudad" : "Colonia y Ciudad (Opcional)"} className="w-full p-2 bg-gray-700 rounded" required={isAddressRequired} />
                <input type="text" name="zipCode" onChange={handleChange} placeholder={isAddressRequired ? "Código Postal" : "Código Postal (Opcional)"} className="w-full p-2 bg-gray-700 rounded" required={isAddressRequired} />
                
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

