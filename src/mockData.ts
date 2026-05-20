import type { Provider, Coordinates } from './types';

// Anchor sectors and their coordinates in Islamabad
export const SECTOR_COORDINATES: Record<string, Coordinates> = {
  'G-13': { lat: 33.6402, lng: 72.9644 },
  'F-11': { lat: 33.6841, lng: 72.9877 },
  'I-8': { lat: 33.6702, lng: 73.0754 },
  'H-12': { lat: 33.6425, lng: 73.0135 },
  'E-11': { lat: 33.7001, lng: 72.9805 },
  'DHA': { lat: 33.5273, lng: 73.1672 },
  'F-6': { lat: 33.7297, lng: 73.0746 },
  'F-7': { lat: 33.7214, lng: 73.0564 },
  'G-10': { lat: 33.6781, lng: 73.0125 },
  'BAHRIA': { lat: 33.5015, lng: 73.1022 }
};

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'p1',
    name: 'Ali AC Repair & Services',
    category: 'ac_technician',
    categoryName: 'AC Technician',
    rating: 4.8,
    locationSector: 'G-13',
    coordinates: { lat: 33.6395, lng: 72.9610 }, // Near G-13
    priceRate: 1500, // PKR per service
    phone: '+92 300 1234567',
    availability: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'],
    avatar: '👨‍🔧',
    completedJobs: 142,
    experienceYears: 6
  },
  {
    id: 'p2',
    name: 'Imran Cool AC Experts',
    category: 'ac_technician',
    categoryName: 'AC Technician',
    rating: 4.5,
    locationSector: 'F-11',
    coordinates: { lat: 33.6810, lng: 72.9890 }, // Near F-11
    priceRate: 1800,
    phone: '+92 312 9876543',
    availability: ['11:00 AM', '12:00 PM', '01:00 PM', '03:00 PM', '05:00 PM'],
    avatar: '💨',
    completedJobs: 89,
    experienceYears: 4
  },
  {
    id: 'p3',
    name: 'Muhammad Sajid (Sajid Plumber)',
    category: 'plumber',
    categoryName: 'Plumber',
    rating: 4.9,
    locationSector: 'G-10',
    coordinates: { lat: 33.6790, lng: 73.0110 }, // Near G-10
    priceRate: 1000,
    phone: '+92 333 4567890',
    availability: ['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM'],
    avatar: '🔧',
    completedJobs: 320,
    experienceYears: 12
  },
  {
    id: 'p4',
    name: 'Bilal Pipe Fitting & Plumbing',
    category: 'plumber',
    categoryName: 'Plumber',
    rating: 4.2,
    locationSector: 'I-8',
    coordinates: { lat: 33.6685, lng: 73.0720 }, // Near I-8
    priceRate: 1200,
    phone: '+92 345 5551234',
    availability: ['09:00 AM', '11:00 AM', '03:00 PM', '05:00 PM'],
    avatar: '🚰',
    completedJobs: 67,
    experienceYears: 3
  },
  {
    id: 'p5',
    name: 'Kamran Electric Work',
    category: 'electrician',
    categoryName: 'Electrician',
    rating: 4.7,
    locationSector: 'F-11',
    coordinates: { lat: 33.6890, lng: 72.9820 }, // Near F-11
    priceRate: 800,
    phone: '+92 321 7778899',
    availability: ['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'],
    avatar: '⚡',
    completedJobs: 215,
    experienceYears: 8
  },
  {
    id: 'p6',
    name: 'Tariq Bijli Service',
    category: 'electrician',
    categoryName: 'Electrician',
    rating: 4.4,
    locationSector: 'E-11',
    coordinates: { lat: 33.7020, lng: 72.9770 }, // Near E-11
    priceRate: 900,
    phone: '+92 301 4443322',
    availability: ['09:00 AM', '10:00 AM', '01:00 PM', '03:00 PM'],
    avatar: '💡',
    completedJobs: 104,
    experienceYears: 5
  },
  {
    id: 'p7',
    name: 'Sir Yasir (Math & Physics Tutor)',
    category: 'tutor',
    categoryName: 'Tutor',
    rating: 4.9,
    locationSector: 'I-8',
    coordinates: { lat: 33.6730, lng: 73.0790 }, // Near I-8
    priceRate: 2500, // PKR per class/hour
    phone: '+92 334 6667788',
    availability: ['03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'],
    avatar: '👨‍🏫',
    completedJobs: 410,
    experienceYears: 10
  },
  {
    id: 'p8',
    name: 'Amina Academic Home Tutors',
    category: 'tutor',
    categoryName: 'Tutor',
    rating: 4.6,
    locationSector: 'H-12',
    coordinates: { lat: 33.6450, lng: 73.0180 }, // Near H-12
    priceRate: 2000,
    phone: '+92 322 8889900',
    availability: ['02:00 PM', '04:00 PM', '06:00 PM'],
    avatar: '👩‍🏫',
    completedJobs: 128,
    experienceYears: 5
  },
  {
    id: 'p9',
    name: 'Zainab Home Beauty & Makeup',
    category: 'beautician',
    categoryName: 'Beautician',
    rating: 4.8,
    locationSector: 'F-7',
    coordinates: { lat: 33.7225, lng: 73.0590 }, // Near F-7
    priceRate: 3500, // PKR per package
    phone: '+92 302 1112233',
    availability: ['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'],
    avatar: '💄',
    completedJobs: 184,
    experienceYears: 7
  },
  {
    id: 'p10',
    name: 'Ayesha Home Salon',
    category: 'beautician',
    categoryName: 'Beautician',
    rating: 4.3,
    locationSector: 'DHA',
    coordinates: { lat: 33.5290, lng: 73.1690 }, // Near DHA
    priceRate: 4000,
    phone: '+92 315 4445566',
    availability: ['11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'],
    avatar: '💅',
    completedJobs: 56,
    experienceYears: 3
  },
  {
    id: 'p11',
    name: 'Rehman Plumber & Pipe Works',
    category: 'plumber',
    categoryName: 'Plumber',
    rating: 4.6,
    locationSector: 'G-13',
    coordinates: { lat: 33.6420, lng: 72.9660 }, // Near G-13
    priceRate: 1100,
    phone: '+92 300 9998877',
    availability: ['09:00 AM', '10:00 AM', '01:00 PM', '03:00 PM'],
    avatar: '🔧',
    completedJobs: 98,
    experienceYears: 5
  },
  {
    id: 'p12',
    name: 'Faisal AC Cooling Solutions',
    category: 'ac_technician',
    categoryName: 'AC Technician',
    rating: 4.7,
    locationSector: 'I-8',
    coordinates: { lat: 33.6710, lng: 73.0770 }, // Near I-8
    priceRate: 1600,
    phone: '+92 336 4443311',
    availability: ['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM'],
    avatar: '❄️',
    completedJobs: 130,
    experienceYears: 8
  }
];

// Helper to calculate distance in km between two coordinates (Haversine formula)
export function getDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1)); // 1 decimal place
}
