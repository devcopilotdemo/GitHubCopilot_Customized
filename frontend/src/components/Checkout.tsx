import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Checkout() {
  const { darkMode } = useTheme();

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4 transition-colors duration-300`}>
      <div className="max-w-3xl mx-auto">
        <div className={`${darkMode ? 'bg-gray-800 text-light' : 'bg-white text-gray-800'} rounded-lg p-8 text-center shadow-lg transition-colors duration-300`}>
          <h1 className="mb-4 text-3xl font-bold">Checkout Handoff</h1>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
            This demo stops before payment, address collection, tax, inventory reservation, or order creation.
          </p>
          <Link
            to="/cart"
            className="inline-flex items-center rounded-lg bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-accent"
          >
            Back to Cart
          </Link>
        </div>
      </div>
    </div>
  );
}
