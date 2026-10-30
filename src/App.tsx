import React, { useEffect, useMemo, useState } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';
import './storefront.css';
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Code2, ExternalLink, LayoutDashboard, LogOut, MessageCircle, PackageOpen, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Store, Trash2, Pencil, X, Eye, Search, Layers3, MousePointer2, MessageSquareText } from 'lucide-react';

type Product = { id: string; title: string; description: string; category: string; tech_stack: string; price: number; image_url: string; demo_url: string; published: boolean; created_at: string };
type Settings = { id: number; store_name: string; whatsapp: string; welcome: string };
const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const db = url && key ? createClient(url, key) : null;
const PRODUCT_CATEGORIES = ['Stream', 'Portfolio', 'Tools', 'Jualan', 'Editor', 'Pendidikan', 'AM Prem', 'Game', 'Dll'];
const blank: Omit<Product, 'id' | 'created_at'> = { title: '', description: '', category: '', tech_stack: '', price: 0, image_url: '', demo_url: '', published: true };
const rupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
const validUrl = (s: string) => { try { return ['http:', 'https:'].includes(new URL(s).protocol); } catch { return false; } };
const phoneClean = (s: string) => { const n = s.replace(/\D/g, ''); return n.startsWith('0') ? '62' + n.slice(1) : n; };

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>({ id: 1, store_name: 'VanStore', whatsapp: '6285725065630', welcome: 'Temukan website siap pakai untuk bisnis Anda.' });
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState(false);
  const [page, setPage] = useState<'catalog' | 'admin'>('catalog');
  const [detail, setDetail] = useState<Product | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Semua');
  const [sort, setSort] = useState('new');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [form, setForm] = useState(blank); const [editing, setEditing] = useState<string | null>(null);
  const [adminQuery, setAdminQuery] = useState(''); const [adminFilter, setAdminFilter] = useState('all');
  const [showPreview, setShowPreview] = useState(false); const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);

  async function load(isAdmin = false) {
    if (!db) { setLoading(false); return; }
    setLoading(true);
    const productQuery = db.from('products').select('*').order('created_at', { ascending: false });
    const [p, s] = await Promise.all([isAdmin ? productQuery : productQuery.eq('published', true), db.from('store_settings').select('*').eq('id', 1).maybeSingle()]);
    if (p.error || s.error) setNotice(`Gagal memuat data: ${p.error?.message || s.error?.message}`);
    else { setProducts((p.data || []) as Product[]); if (s.data) setSettings({ ...s.data, whatsapp: s.data.whatsapp || '6285725065630' } as Settings); }
    setLoading(false);
  }
  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const client = db;
    async function check(s: Session | null) {
      setSession(s); setAdmin(false);
      if (!s) { await load(false); return; }
      const { data, error } = await client.from('admin_users').select('user_id').eq('user_id', s.user.id).maybeSingle();
      const allowed = !!data && !error; setAdmin(allowed);
      if (!allowed) setNotice('Akun ini belum terdaftar sebagai admin.');
      await load(allowed);
    }
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => { setTimeout(() => { void check(s); }, 0); });
    return () => sub.subscription.unsubscribe();
  }, []);
  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter(p => p.published && (category === 'Semua' || p.category === category) && [p.title, p.description, p.category, p.tech_stack].some(x => (x || '').toLowerCase().includes(q))).sort((a,b) => sort === 'low' ? a.price-b.price : sort === 'high' ? b.price-a.price : new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
  }, [products, query, category, sort]);
  const adminProducts = products.filter(p => (adminFilter === 'all' || (adminFilter === 'published' ? p.published : !p.published)) && [p.title, p.category, p.tech_stack].some(v => (v || '').toLowerCase().includes(adminQuery.toLowerCase().trim())));
  const categories = ['Semua', ...PRODUCT_CATEGORIES, ...Array.from(new Set(products.filter(p => p.published && !PRODUCT_CATEGORIES.includes(p.category)).map(p => p.category).filter(Boolean)))];
  function order(p: Product) {
    const number = phoneClean(settings.whatsapp);
    if (!/^62\d{8,13}$/.test(number)) { setNotice('Nomor WhatsApp toko belum dikonfigurasi dengan benar. Silakan hubungi pemilik toko.'); return; }
    const message = `Halo ${settings.store_name}, saya tertarik dengan website berikut:\n\nProduk: ${p.title}\nHarga tertera: ${rupiah(p.price)}\n\nSaya ingin bertanya dan berdiskusi mengenai harga, fitur, pembayaran, dan pengiriman file mentahan. Terima kasih.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }
  async function login(e: React.FormEvent) {
    e.preventDefault(); if (!db) return; setBusy(true); setNotice('');
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) setNotice('Login gagal. Periksa email dan password.'); else setPassword(''); setBusy(false);
  }
  async function saveProduct(e: React.FormEvent) {
    e.preventDefault(); if (!db || !admin) return;
    if (!form.title.trim() || !form.description.trim() || !form.category.trim() || !Number.isFinite(form.price) || form.price < 0) { setNotice('Lengkapi nama, deskripsi, kategori, dan harga yang valid.'); return; }
    if ((form.image_url && !validUrl(form.image_url)) || (form.demo_url && !validUrl(form.demo_url))) { setNotice('URL gambar dan demo harus menggunakan http atau https.'); return; }
    setBusy(true); setNotice('');
    const payload = { ...form, title: form.title.trim(), price: Number(form.price) };
    const result = editing ? await db.from('products').update(payload).eq('id', editing).select('id').single() : await db.from('products').insert(payload).select('id').single();
    if (result.error) setNotice('Produk gagal disimpan: ' + result.error.message);
    else { setNotice(form.published ? 'Produk berhasil disimpan dan dipublikasikan di katalog.' : 'Produk berhasil disimpan sebagai draft; tidak terlihat oleh pengunjung.'); setForm(blank); setEditing(null); setShowPreview(false); await load(true); }
    setBusy(false);
  }
  async function remove(p: Product) {
    if (!db || !admin || !window.confirm(`Hapus produk “${p.title}”? Tindakan ini tidak bisa dibatalkan.`)) return;
    const { error } = await db.from('products').delete().eq('id', p.id).select('id').single();
    if (error) setNotice('Gagal menghapus: ' + error.message); else { setNotice('Produk dihapus.'); if (editing === p.id) {setEditing(null);setForm(blank);} await load(true); }
  }
  async function saveSettings(e: React.FormEvent) {
    e.preventDefault(); if (!db || !admin) return;
    const number = phoneClean(settings.whatsapp);
    if (!/^62\d{8,13}$/.test(number) || !settings.store_name.trim()) { setNotice('Isi nama toko dan nomor WhatsApp Indonesia yang valid, misalnya 6281234567890.'); return; }
    setBusy(true); const { error } = await db.from('store_settings').upsert({ ...settings, whatsapp: number }).select('id').single();
    setNotice(error ? 'Pengaturan gagal disimpan: ' + error.message : 'Pengaturan toko disimpan.'); setBusy(false);
  }
  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file || !db || !admin) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setNotice('Pilih gambar JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.'); return; }
    setUploading(true); setNotice('');
    try {
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false });
      if (error) { setNotice('Upload gambar gagal: ' + error.message); return; }
      const { data } = db.storage.from('product-images').getPublicUrl(path);
      setForm(prev => ({ ...prev, image_url: data.publicUrl }));
      setNotice('Gambar berhasil diunggah. Simpan produk untuk menggunakan gambar ini.');
    } catch { setNotice('Upload gambar gagal. Periksa koneksi dan konfigurasi Supabase Storage.'); }
    finally { setUploading(false); }
  }
  const edit = (p: Product) => { const { id, created_at, ...rest } = p; setForm(rest); setEditing(id); window.scrollTo({top:0,behavior:'smooth'}); };
  return <div className="shell">
    <header className="top"><button className="brand" onClick={() => {setPage('catalog');setDetail(null);}}><span className="brand-icon"><Store size={20}/></span> {settings.store_name}<span className="brand-dot">.</span></button><nav><button onClick={() => {setPage('catalog');setDetail(null);}}><ShoppingBag size={16}/> Katalog</button><button onClick={() => {setPage('admin');setDetail(null);setNotice('');}}><LayoutDashboard size={16}/> Admin</button></nav></header>
    {!db && <div className="alert">Supabase belum dikonfigurasi. Ikuti panduan README untuk mengaktifkan katalog dan admin.</div>}
    {notice && <div className="alert notice" role="status" aria-live="polite">{notice}<button onClick={() => setNotice('')} aria-label="Tutup"><X size={18}/></button></div>}
    <main>
    {page === 'catalog' ? detail ? <section className="detail"><button className="textbtn" onClick={() => setDetail(null)}><ArrowLeft size={16}/> Kembali ke katalog</button><div className="detail-grid"><div className="visual">{detail.image_url && validUrl(detail.image_url) ? <img src={detail.image_url} alt={detail.title}/> : <div className="placeholder"><Code2 size={80}/></div>}</div><div><span className="tag">{detail.category}</span><h1>{detail.title}</h1><p className="price">{rupiah(detail.price)}</p><p className="muted">Harga tertera. Detail harga dan kesepakatan dibicarakan melalui WhatsApp.</p><p className="description">{detail.description}</p><p><strong>Teknologi:</strong> {detail.tech_stack || 'Tanyakan kepada penjual'}</p><div className="actions"><button className="primary" onClick={() => order(detail)}><MessageCircle size={18}/> Tanya &amp; pesan via WhatsApp <ArrowUpRight size={16}/></button>{detail.demo_url && validUrl(detail.demo_url) && <a className="secondary" href={detail.demo_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Lihat demo</a>}</div><p className="muted small">Pembayaran dan pengiriman file disepakati secara langsung dengan penjual di WhatsApp.</p></div></div></section> : <><section className="hero-new"><div className="hero-copy"><div className="hero-kicker"><span className="pulse-dot"/> DIGITAL SOURCE CODE MARKETPLACE <span className="kicker-number">// 001</span></div><h1>Bangun ide.<br/><span>Tanpa mulai</span><br/><em>dari nol.</em></h1><p>{settings.welcome} Pilih source code yang cocok, lalu diskusikan kebutuhan Anda langsung dengan kami.</p><div className="hero-actions"><a className="hero-cta" href="#katalog">Jelajahi produk <ArrowUpRight size={18}/></a><a className="hero-secondary" href={`https://wa.me/${phoneClean(settings.whatsapp)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/> Tanya WhatsApp</a></div><div className="hero-note"><span className="note-icon"><Code2 size={16}/></span><div><strong>Untuk ide yang siap dijalankan.</strong><br/>Jelajahi koleksi, bicarakan detailnya.</div></div></div><div className="hero-art"><div className="art-top"><span><span className="pulse-dot"/> THE VANSTORE COLLECTION</span><span>EST. DIGITAL / 01</span></div><img src="/vanstore-banner.png" alt="Banner VanStore: source code website siap deploy"/><div className="art-bottom"><div><span>BUILT FOR YOUR NEXT IDEA</span><strong>Source code.<br/>Your way<span className="red-dot">.</span></strong></div><div className="art-mark"><ArrowUpRight size={28}/></div></div><div className="art-caption">PREMIUM DIGITAL PRODUCTS <span>✳</span> VANSTORE</div></div></section><section className="benefit-strip" aria-label="Cara membeli"><div><span className="benefit-icon"><Layers3 size={19}/></span><p><strong>01 / Pilih produk</strong><small>Temukan website yang cocok</small></p></div><div><span className="benefit-icon"><MessageSquareText size={19}/></span><p><strong>02 / Diskusi langsung</strong><small>Negosiasi via WhatsApp</small></p></div><div><span className="benefit-icon"><MousePointer2 size={19}/></span><p><strong>03 / Siap lanjut</strong><small>File dikirim setelah kesepakatan</small></p></div></section><section id="katalog"><div className="sectionhead"><div><span className="catalog-kicker"><span/> CURATED FOR YOUR NEXT PROJECT</span><h2>Katalog <em>pilihan.</em></h2><p className="catalog-desc">Temukan source code yang sesuai dengan kebutuhan Anda.</p></div><span className="product-count"><span/> {visible.length} PRODUK TERSEDIA</span></div><div className="filters"><input aria-label="Cari produk" placeholder="Cari produk atau teknologi..." value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Kategori" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select><select aria-label="Urutkan" value={sort} onChange={e=>setSort(e.target.value)}><option value="new">Terbaru</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option></select></div><div className="category-pills" aria-label="Pilih jenis produk">{categories.map(c => <button type="button" key={c} className={category === c ? "category-pill active" : "category-pill"} onClick={() => setCategory(c)} aria-pressed={category === c}>{c}</button>)}</div>{loading ? <p className="empty">Memuat produk...</p> : visible.length === 0 ? <p className="empty">Belum ada produk yang cocok.</p> : <div className="grid">{visible.map(p=><article className="card" key={p.id}><button className="card-image" onClick={()=>setDetail(p)} aria-label={`Lihat ${p.title}`}>{p.image_url && validUrl(p.image_url) ? <img src={p.image_url} alt="" loading="lazy"/> : <span><Code2 size={54}/></span>}</button><div className="card-body"><span className="tag">{p.category}</span><h3>{p.title}</h3><p className="muted excerpt">{p.description}</p><p className="stack">{p.tech_stack}</p><div className="card-bottom"><strong>{rupiah(p.price)}</strong><button className="secondary" onClick={()=>setDetail(p)}>Detail <ArrowRight size={15}/></button></div></div></article>)}</div>}</section></> : <section className="admin"><div className="sectionhead"><div><span className="eyebrow">PRIVATE WORKSPACE</span><h1>Dashboard admin</h1><p className="muted">Kelola katalog dan kontak toko Anda.</p></div>{session && <button className="secondary" onClick={async()=>{await db?.auth.signOut();setNotice('Anda telah keluar.');}}><LogOut size={16}/> Keluar</button>}</div>{!session ? <form className="panel login" onSubmit={login}><h2><ShieldCheck size={23}/> Masuk admin</h2><p className="muted">Gunakan email dan password akun Supabase yang telah diberi akses admin.</p><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary" disabled={busy || !db}>{busy ? 'Memproses...' : 'Masuk'}</button></form> : !admin ? <div className="panel">Akun ini tidak memiliki hak admin. Hubungi pemilik proyek untuk mengatur akses.</div> : <><div className="admin-columns"><form className="panel" onSubmit={saveProduct}><h2>{editing ? 'Edit produk' : 'Tambah produk'}</h2><label>Nama produk *<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Jenis produk *<select required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="">Pilih jenis produk</option>{PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}{form.category && !PRODUCT_CATEGORIES.includes(form.category) && <option value={form.category}>{form.category}</option>}</select></label><label>Harga (Rp) *<input type="number" min="0" step="1" required value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/></label><label>Deskripsi lengkap *<textarea required rows={6} placeholder="Fitur, isi paket, ketentuan lisensi, dan persyaratan..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Teknologi<input placeholder="React, Laravel, MySQL..." value={form.tech_stack} onChange={e=>setForm({...form,tech_stack:e.target.value})}/></label><label>Upload gambar produk<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={uploadImage}/><span className="muted small">JPG, PNG, atau WebP • maksimal 5 MB. Gambar yang diunggah bersifat publik.</span></label>{uploading && <p className="muted small">Mengunggah gambar...</p>}<label>Atau gunakan URL gambar publik<input type="url" placeholder="https://..." value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})}/></label><label>URL demo publik (opsional)<input type="url" placeholder="https://..." value={form.demo_url} onChange={e=>setForm({...form,demo_url:e.target.value})}/></label><label className="check"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/> Publikasikan di katalog</label><div className="actions"><button className="primary" disabled={busy || uploading}>{busy ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Simpan produk'}</button><button type="button" className="secondary" onClick={()=>setShowPreview(v=>!v)}><Eye size={16}/> {showPreview ? 'Tutup pratinjau' : 'Pratinjau'}</button>{editing && <button type="button" className="secondary" onClick={()=>{setEditing(null);setForm(blank);}}>Batal edit</button>}</div>{showPreview && <div className="preview-box"><span className="eyebrow">PRATINJAU PRODUK</span><div className="preview-product">{form.image_url && validUrl(form.image_url) ? <img src={form.image_url} alt="Pratinjau gambar produk"/> : <div className="preview-placeholder"><Code2 size={35}/></div>}<div><span className="tag">{form.category || 'Jenis produk'}</span><h3>{form.title || 'Nama produk'}</h3><strong>{rupiah(form.price || 0)}</strong><p className="muted small description">{form.description || 'Deskripsi produk akan tampil di sini.'}</p><p className="muted small">{form.published ? 'Akan tampil di katalog setelah disimpan.' : 'Draft: hanya admin yang dapat melihat.'}</p></div></div></div>}<p className="muted small">Jangan masukkan link file mentahan atau informasi rahasia pada produk publik. File dikirim manual setelah kesepakatan.</p></form><div><form className="panel" onSubmit={saveSettings}><h2><SlidersHorizontal size={21}/> Pengaturan toko</h2><label>Nama toko<input required value={settings.store_name} onChange={e=>setSettings({...settings,store_name:e.target.value})}/></label><label>Nomor WhatsApp Indonesia<input required placeholder="6281234567890" value={settings.whatsapp} onChange={e=>setSettings({...settings,whatsapp:e.target.value})}/></label><label>Pesan pembuka<textarea rows={3} value={settings.welcome} onChange={e=>setSettings({...settings,welcome:e.target.value})}/></label><button className="primary" disabled={busy}>Simpan pengaturan</button></form><div className="panel"><h2><MessageCircle size={21}/> Alur transaksi</h2><p className="muted">Pembeli menghubungi Anda melalui WhatsApp. Negosiasi, pembayaran, dan pengiriman file dilakukan secara manual di luar website. Website tidak mengonfirmasi pembayaran atau membuat pesanan otomatis.</p></div></div></div><div className="panel"><h2><PackageOpen size={21}/> Daftar produk ({products.length})</h2><div className="admin-filters"><label className="search-label"><Search size={16}/><input aria-label="Cari produk admin" placeholder="Cari nama, kategori, teknologi..." value={adminQuery} onChange={e=>setAdminQuery(e.target.value)}/></label><select aria-label="Filter status produk" value={adminFilter} onChange={e=>setAdminFilter(e.target.value)}><option value="all">Semua status</option><option value="published">Publik</option><option value="draft">Draft</option></select></div>{adminProducts.length === 0 ? <p className="muted">Tidak ada produk yang sesuai. Tambahkan produk atau ubah filter.</p> : adminProducts.map(p=><div className="admin-item" key={p.id}><div><strong>{p.title}</strong><p className="muted small">{rupiah(p.price)} · {p.published ? 'Publik' : 'Draft'}</p></div><div className="actions"><button className="secondary" onClick={()=>edit(p)}><Pencil size={14}/> Edit</button><button className="danger" onClick={()=>remove(p)}><Trash2 size={14}/> Hapus</button></div></div>)}</div></>}</section>}
    </main><footer>© {new Date().getFullYear()} {settings.store_name} · Produk digital, komunikasi langsung via WhatsApp</footer></div>;
}
