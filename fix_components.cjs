const fs = require('fs');
let code = fs.readFileSync('src/TransactionForms.tsx', 'utf8');

// Add formatMoney if not exists
if (!code.includes("import { formatMoney }")) {
  code = code.replace(
    "import { motion, AnimatePresence } from 'motion/react';",
    "import { motion, AnimatePresence } from 'motion/react';\nimport { formatMoney } from './App';"
  );
}

// Add Wallet import
if (!code.includes("Wallet")) {
  code = code.replace(
    "import { \n  X, Search, CheckCircle2, ChevronLeft, \n  Calendar, MessageSquare, QrCode, Repeat,\n  ShoppingBag, Car, Home, Briefcase, Coffee, Gift, Heart, Music, Smartphone, Plane, Book, Film, Activity, Box, Plus\n} from 'lucide-react';",
    "import { \n  X, Search, CheckCircle2, ChevronLeft, \n  Calendar, MessageSquare, QrCode, Repeat, Wallet,\n  ShoppingBag, Car, Home, Briefcase, Coffee, Gift, Heart, Music, Smartphone, Plane, Book, Film, Activity, Box, Plus\n} from 'lucide-react';"
  );
}

fs.writeFileSync('src/TransactionForms.tsx', code);
