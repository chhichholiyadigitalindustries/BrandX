/**
 * BRANDX Admin Festivals Management Screen (/admin/festivals)
 */

import React, { useEffect, useState } from 'react';
import { festivalService } from '../services/festivalService';
import { AdminFestival } from '../types';
import { useAdminToast } from '../components/AdminToast';
import { AdminModal } from '../components/AdminModal';

export const AdminFestivalsScreen: React.FC = () => {
  const [festivals, setFestivals] = useState<AdminFestival[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFest, setEditingFest] = useState<AdminFestival | null>(null);
  const { showToast } = useAdminToast();

  const [formName, setFormName] = useState('');
  const [formHindiName, setFormHindiName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formGreetingHindi, setFormGreetingHindi] = useState('');
  const [formGreetingEnglish, setFormGreetingEnglish] = useState('');

  const loadFestivals = async () => {
    setIsLoading(true);
    const list = await festivalService.getFestivals();
    setFestivals(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadFestivals();
  }, []);

  const openNewModal = () => {
    setEditingFest(null);
    setFormName('');
    setFormHindiName('');
    setFormDate('');
    setFormDescription('');
    setFormGreetingHindi('');
    setFormGreetingEnglish('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await festivalService.saveFestival({
      id: editingFest?.id,
      name: formName,
      hindiName: formHindiName,
      date: formDate,
      description: formDescription,
      greetings: {
        hindi: formGreetingHindi,
        english: formGreetingEnglish,
      },
    });

    showToast('Festival saved to BrandX Calendar!');
    setIsModalOpen(false);
    loadFestivals();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <h3 className="font-extrabold text-white text-base">Indian Festivals &amp; Cultural Events Calendar</h3>
          <p className="text-xs text-gray-400">Schedule festival announcements, banner packs &amp; greetings.</p>
        </div>
        <button
          onClick={openNewModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Add New Festival</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading festivals...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {festivals.map((fest) => (
            <div
              key={fest.id}
              className="bg-[#0E1424] border border-white/10 hover:border-white/20 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between p-5 space-y-4 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-amber-400 text-[24px]">celebration</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">{fest.name}</h4>
                    <p className="text-xs text-emerald-400 font-semibold">{fest.hindiName}</p>
                  </div>
                </div>

                <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white font-bold shrink-0">
                  {fest.date}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
                <p className="text-gray-300 font-medium leading-snug">"{fest.greetings.hindi}"</p>
                <p className="text-gray-400 text-[11px] italic">{fest.greetings.english}</p>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-gray-400 text-[11px]">
                  <strong className="text-white">{fest.postersCount}</strong> posters attached
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                  Active in App
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <AdminModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title="Configure Festival Event"
          maxWidth="md"
        >
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">English Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Hindi Name</label>
                <input
                  type="text"
                  required
                  value={formHindiName}
                  onChange={(e) => setFormHindiName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Festival Date</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Hindi Greeting Quote</label>
              <textarea
                rows={2}
                required
                value={formGreetingHindi}
                onChange={(e) => setFormGreetingHindi(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">English Greeting Quote</label>
              <textarea
                rows={2}
                value={formGreetingEnglish}
                onChange={(e) => setFormGreetingEnglish(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold"
              >
                Save Festival
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
};
