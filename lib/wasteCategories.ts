import { Biohazard, Leaf, Recycle, Trash2, type LucideIcon } from 'lucide-react';
import type { WasteCategory } from '@/types/waste';

export interface WasteCategoryMeta {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  chartColor: string;
  instructions: string[];
}

export const WASTE_CATEGORIES: Record<WasteCategory, WasteCategoryMeta> = {
  organic: {
    label: 'Organic',
    icon: Leaf,
    badgeClass: 'bg-emerald-700 text-white',
    chartColor: '#059669',
    instructions: [
      'Pisahkan sisa makanan, daun, dan sayuran dari plastik.',
      'Buang ke tempat sampah hijau atau olah menjadi kompos di rumah.',
      'Jangan dicampur dengan plastik agar mudah diolah.',
    ],
  },
  inorganic: {
    label: 'Anorganic',
    icon: Recycle,
    badgeClass: 'bg-sky-600 text-white',
    chartColor: '#0284C7',
    instructions: [
      'Bersihkan dan keringkan botol, kaleng, atau kertas dari sisa makanan.',
      'Buang ke tempat sampah kuning atau setorkan ke bank sampah terdekat.',
      'Remukkan kemasan besar agar lebih hemat tempat.',
    ],
  },
  residue: {
    label: 'Residu',
    icon: Trash2,
    badgeClass: 'bg-rose-600 text-white',
    chartColor: '#E11D48',
    instructions: [
      'Jangan dibuang bersama sampah organik atau daur ulang.',
      'Masukkan ke tempat sampah abu-abu atau kantong tertutup terpisah.',
      'Baterai, lampu, dan limbah medis diserahkan ke titik pengumpulan khusus.',
    ],
  },
  b3: {
    label: 'B3',
    icon: Biohazard,
    badgeClass: 'bg-amber-600 text-white',
    chartColor: '#D97706',
    instructions: [
      'Pisahkan dari sampah rumah tangga lainnya dan jangan dibuka atau dibakar.',
      'Simpan dengan aman dalam wadah tertutup dan beri tanda bila memungkinkan.',
      'Serahkan ke titik pengumpulan limbah B3 atau fasilitas berwenang.',
    ],
  },
};

export const WASTE_CATEGORY_ORDER: WasteCategory[] = ['organic', 'inorganic', 'residue', 'b3'];
