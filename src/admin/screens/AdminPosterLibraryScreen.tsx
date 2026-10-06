/**
 * BRANDX Admin Poster Library Screen (/admin/posters)
 * Complete marketing poster & template library with categories, search, upload, and status management.
 */

import React, { useEffect, useState } from 'react';
import { posterService } from '../services/posterService';
import { imageUploadService } from '../services/imageUploadService';
import { AdminPoster } from '../types';
import { useAdminToast } from '../components/AdminToast';
import { AdminModal } from '../components/AdminModal';
import { resolveImageUrl } from '../../utils/imageUrl';

export const AdminPosterLibraryScreen: React.FC = () => {
  const [posters, setPosters] = useState<AdminPoster[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPoster, setEditingPoster] = useState<AdminPoster | null>(null);
  const { showToast } = useAdminToast();

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<AdminPoster['category']>('Offers');
  const [formHeadline, setFormHeadline] = useState('');
  const [formSubheadline, setFormSubheadline] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formAspectRatio, setFormAspectRatio] = useState<AdminPoster['aspectRatio']>('1:1');

  const categories = [
    'All',
    'Morning',
    'Suvichar',
    'Festival',
    'Offers',
    'Wedding',
    'Cafe',
    'Salon',
    'Restaurant',
    'Retail',
    'General',
  ];

  const loadPosters = async () => {
    setIsLoading(true);
    const data = await posterService.getPosters({
      category: selectedCategory === 'All' ? 'all' : selectedCategory,
      search,
    });
    setPosters(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadPosters();
  }, [selectedCategory, search]);

  const openCreateModal = () => {
    setEditingPoster(null);
    setFormTitle('');
    setFormCategory('Offers');
    setFormHeadline('');
    setFormSubheadline('');
    setFormImageUrl('');
    setFormAspectRatio('1:1');
    setIsModalOpen(true);
  };

  const openEditModal = (poster: AdminPoster) => {
    setEditingPoster(poster);
    setFormTitle(poster.title);
    setFormCategory(poster.category);
    setFormHeadline(poster.headlineDefault);
    setFormSubheadline(poster.subheadlineDefault);
    setFormImageUrl(poster.imageUrl);
    setFormAspectRatio(poster.aspectRatio);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const res = await imageUploadService.uploadImage(e.target.files[0], 'posters');
        setFormImageUrl(res.url);
        showToast('Poster image ready for publishing!');
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImageUrl) {
      showToast('Please upload or enter a poster image URL', 'error');
      return;
    }
    await posterService.savePoster({
      id: editingPoster?.id,
      title: formTitle,
      category: formCategory,
      headlineDefault: formHeadline,
      subheadlineDefault: formSubheadline,
      imageUrl: formImageUrl,
      aspectRatio: formAspectRatio,
      status: 'published',
    });

    showToast('Poster saved to Template Library!');
    setIsModalOpen(false);
    loadPosters();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this poster template?')) {
      await posterService.deletePoster(id);
      showToast('Poster deleted');
      loadPosters();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <h3 className="font-extrabold text-white text-base">Commercial Poster &amp; Design Studio CMS</h3>
          <p className="text-xs text-gray-400">Manage graphic templates distributed to vyaparis across India.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
          <span>Upload Poster Template</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-emerald-500 text-emerald-950 shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search poster title or headline..."
            className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Grid of Posters */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading poster library...</div>
      ) : posters.length === 0 ? (
        <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-12 text-center text-gray-400">
          <span className="material-symbols-outlined text-[48px] text-gray-400 mb-2">image_not_supported</span>
          <p className="text-sm font-semibold text-white">No posters found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {posters.map((poster) => (
            <div
              key={poster.id}
              className="bg-[#0E1424] border border-white/10 hover:border-white/20 rounded-2xl overflow-hidden shadow-xl flex flex-col group transition-all"
            >
              {/* Thumbnail */}
              <div className="relative aspect-square w-full bg-black overflow-hidden">
                <img
                  src={resolveImageUrl(poster.imageUrl)}
                  alt={poster.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-emerald-300 border border-white/15">
                  {poster.category}
                </div>
                {poster.isTrending && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500/80 backdrop-blur-md text-[10px] font-bold text-black flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">local_fire_department</span>
                    <span>HOT</span>
                  </div>
                )}
              </div>

              {/* Card Meta */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h4 className="font-bold text-white text-xs truncate leading-snug">{poster.headlineDefault}</h4>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{poster.subheadlineDefault}</p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-white/5 pt-2">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <span className="material-symbols-outlined text-[14px]">share</span>
                    {poster.sharesCount.toLocaleString('en-IN')} shares
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(poster)}
                      className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white"
                      title="Edit"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(poster.id)}
                      className="p-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                      title="Delete"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Upload Modal */}
      {isModalOpen && (
        <AdminModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={editingPoster ? 'Edit Poster Template' : 'Upload New Poster Template'}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  {categories.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c} className="bg-[#0E1424]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Aspect Ratio</label>
                <select
                  value={formAspectRatio}
                  onChange={(e) => setFormAspectRatio(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="1:1" className="bg-[#0E1424]">1:1 Square</option>
                  <option value="9:16" className="bg-[#0E1424]">9:16 Story / Status</option>
                  <option value="16:9" className="bg-[#0E1424]">16:9 Banner</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Headline Text</label>
              <input
                type="text"
                required
                value={formHeadline}
                onChange={(e) => setFormHeadline(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Subheadline Text</label>
              <textarea
                rows={2}
                value={formSubheadline}
                onChange={(e) => setFormSubheadline(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Poster Graphic Image</label>
              <label className="border border-dashed border-white/20 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors bg-white/[0.02]">
                <span className="material-symbols-outlined text-[24px] text-emerald-400 mb-1">upload</span>
                <span className="text-white font-bold">Select Image</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {formImageUrl && (
                <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-white/20">
                  <img src={resolveImageUrl(formImageUrl)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
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
                Save to Library
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
};
