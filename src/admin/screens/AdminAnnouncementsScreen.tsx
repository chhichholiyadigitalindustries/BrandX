/**
 * BRANDX Admin Announcements Screen (/admin/announcements)
 */

import React, { useEffect, useState } from 'react';
import { announcementService } from '../services/announcementService';
import { AdminAnnouncement } from '../types';
import { useAdminToast } from '../components/AdminToast';
import { AdminModal } from '../components/AdminModal';

export const AdminAnnouncementsScreen: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<AdminAnnouncement | null>(null);
  const { showToast } = useAdminToast();

  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formPriority, setFormPriority] = useState<AdminAnnouncement['priority']>('medium');
  const [formTarget, setFormTarget] = useState<AdminAnnouncement['targetAudience']>('all');
  const [formActionLabel, setFormActionLabel] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const data = await announcementService.getAnnouncements();
    setAnnouncements(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewModal = () => {
    setEditingAnn(null);
    setFormTitle('');
    setFormMessage('');
    setFormPriority('medium');
    setFormTarget('all');
    setFormActionLabel('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await announcementService.saveAnnouncement({
      id: editingAnn?.id,
      title: formTitle,
      message: formMessage,
      priority: formPriority,
      targetAudience: formTarget,
      actionLabel: formActionLabel,
    });

    showToast('In-App announcement published to users!');
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this announcement?')) {
      await announcementService.deleteAnnouncement(id);
      showToast('Announcement removed');
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <h3 className="font-extrabold text-white text-base">In-App Broadcast Announcement Center</h3>
          <p className="text-xs text-gray-400">Push real-time banners, feature launches and maintenance alerts to user apps.</p>
        </div>
        <button
          onClick={openNewModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">campaign</span>
          <span>Create Announcement</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-12 text-center text-gray-400">
          <p className="text-sm font-semibold text-white">No active announcements</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-[#0E1424] border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      ann.priority === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {ann.priority.toUpperCase()} PRIORITY
                  </span>
                  <span className="text-[10px] text-gray-400">Audience: {ann.targetAudience}</span>
                </div>
                <h4 className="font-bold text-white text-sm">{ann.title}</h4>
                <p className="text-xs text-gray-300 leading-relaxed">{ann.message}</p>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-[11px] text-gray-400 font-mono">
                  {ann.viewsCount.toLocaleString('en-IN')} views • {ann.clicksCount} clicks
                </span>
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold"
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <AdminModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title="Compose In-App Announcement"
          maxWidth="md"
        >
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Title</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Message Content</label>
              <textarea
                rows={3}
                required
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Priority</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="low" className="bg-[#0E1424]">Low</option>
                  <option value="medium" className="bg-[#0E1424]">Medium</option>
                  <option value="high" className="bg-[#0E1424]">High</option>
                  <option value="urgent" className="bg-[#0E1424]">Urgent Broadcast</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Target Audience</label>
                <select
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all" className="bg-[#0E1424]">All Users</option>
                  <option value="free_users" className="bg-[#0E1424]">Free Users Only</option>
                  <option value="pro_users" className="bg-[#0E1424]">PRO Users Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Button Action Label</label>
              <input
                type="text"
                value={formActionLabel}
                onChange={(e) => setFormActionLabel(e.target.value)}
                placeholder="e.g. Check it out"
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
                Broadcast Announcement
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
};
