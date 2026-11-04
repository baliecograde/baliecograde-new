import { Flame, Leaf, Recycle, Trash2, type LucideIcon } from 'lucide-react';
import type { WasteCategory } from '@/types/waste';

export interface WasteCategoryMeta {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  chartColor: string;
  instructions: string[];
}

export const WASTE_CATEGORIES: Record<WasteCategory, WasteCategoryMeta> = {
  ORGANIK: {
    label: 'Organik',
    icon: Leaf,
    badgeClass: 'bg-emerald-700 text-white',
    chartColor: '#059669',
    instructions: [
      'Pisahkan sisa makanan, daun, dan sayuran dari plastik.',
      'Olah menjadi kompos atau buang ke tempat sampah organik.',
      'Jangan dicampur dengan material daur ulang.',
    ],
  },
  ANORGANIK: {
    label: 'Anorganik',
    icon: Recycle,
    badgeClass: 'bg-sky-600 text-white',
    chartColor: '#0284C7',
    instructions: [
      'Bersihkan dan keringkan material yang dapat didaur ulang.',
      'Setorkan ke bank sampah atau titik daur ulang.',
      'Pisahkan berdasarkan jenis material jika fasilitas meminta.',
    ],
  },
  RESIDU: {
    label: 'Residu',
    icon: Trash2,
    badgeClass: 'bg-rose-600 text-white',
    chartColor: '#E11D48',
    instructions: [
      'Pisahkan dari sampah organik dan material daur ulang.',
      'Masukkan ke wadah residu tertutup.',
      'Jangan masukkan limbah berbahaya ke alur residu biasa.',
    ],
  },
  B3: {
    label: 'B3',
    icon: Flame,
    badgeClass: 'bg-amber-700 text-white',
    chartColor: '#D97706',
    instructions: [
      'Jangan campur dengan sampah rumah tangga biasa.',
      'Simpan dengan aman dan hindari kontak langsung.',
      'Serahkan ke fasilitas pengumpulan limbah B3 resmi.',
    ],
  },
};

export const WASTE_CATEGORY_ORDER: WasteCategory[] = ['ORGANIK', 'ANORGANIK', 'RESIDU', 'B3'];
