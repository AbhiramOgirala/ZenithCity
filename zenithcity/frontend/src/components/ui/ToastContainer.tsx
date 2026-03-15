import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { RootState } from '../../store';
import { removeToast } from '../../store/slices/uiSlice';
import { useEffect } from 'react';

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'border-neon-green/40 text-neon-green',
  error: 'border-neon-pink/40 text-neon-pink',
  info: 'border-neon-cyan/40 text-neon-cyan',
  warning: 'border-neon-yellow/40 text-neon-yellow',
};

function Toast({ id, type, message }: { id: string; type: string; message: string }) {
  const dispatch = useDispatch();
  const Icon = icons[type as keyof typeof icons] || Info;
  const color = colors[type as keyof typeof colors] || colors.info;

  useEffect(() => {
    const timer = setTimeout(() => dispatch(removeToast(id)), 4000);
    return () => clearTimeout(timer);
  }, [id, dispatch]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className={`flex items-start gap-3 p-4 glass border rounded-xl max-w-sm ${color}`}
    >
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <p className="flex-1 text-sm text-white font-body">{message}</p>
      <button onClick={() => dispatch(removeToast(id))} className="text-space-400 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const { toasts } = useSelector((s: RootState) => s.ui);
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => <Toast key={t.id} {...t} />)}
      </AnimatePresence>
    </div>
  );
}
