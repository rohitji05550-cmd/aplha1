import React, { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { FREE_ZONES } from '../mock';
import { supabaseRest } from '../lib/supabaseRest';
import { getToken } from '../lib/authTokenStorage';
import { loadFreezonePackages } from '../lib/pricingService';
import { adminApi } from '../lib/backendApi';
import {
  listCoupons, createCoupon, updateCoupon, deleteCoupon,
  updateOrderStatus, updateLeadStatus,
  listAllMemberships, setMembershipActive,
  listAllKyc, downloadCsv,
} from '../lib/adminSupabase';
import { listPaymentProofs, signProofUrl, updateProofStatus } from '../lib/paymentProofs';

const ADMIN_ROLES = ['founder', 'admin', 'manager', 'staff', 'reviewer'];

export default function AdminPanel() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState('overview');
  const [leads, setLeads] = useState([]);
  const [localLeads, setLocalLeads] = useState([]);
  const [freezones, setFreezones] = useState(FREE_ZONES.map((z) => ({ ...z, active: true })));
  const [livePackages, setLivePackages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [roleRows, setRoleRows] = useState([]);
  const [activities, setActivities] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [kycRows, setKycRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userEdit, setUserEdit] = useState({ new_password: '', new_role: 'staff', disable: false, full_name: '', assigned_manager: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', description: '', discount_type: 'percent', discount_value: 5, max_uses: 0 });
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  useEffect(() => {
    if (!loading && !user) navigate('/login?redirect=/admin');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadLeads(); loadActivities(); loadPackages(); loadOrders(); loadRoles();
      loadUsers(); loadCoupons(); loadMemberships(); loadKyc();
    }
    // The callbacks below are useCallback-stable; intentionally excluded from deps
    // to avoid a temporal-dead-zone access during the initial render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const loadCoupons = useCallback(async () => {
    const rows = await listCoupons();
    setCoupons(rows || []);
  }, []);
  const loadMemberships = useCallback(async () => {
    const rows = await listAllMemberships();
    setMemberships(rows || []);
  }, []);
  const loadKyc = useCallback(async () => {
    const rows = await listAllKyc();
    setKycRows(rows || []);
  }, []);

  const loadLeads = useCallback(async () => {
    const token = getToken();
    let pending = [];
    let consultations = [];
    try { pending = JSON.parse(localStorage.getItem('ssu_leads') || '[]'); } catch (err) { console.warn('[admin] failed to parse cached leads', err); }
    try { consultations = JSON.parse(localStorage.getItem('ssu_consultations') || '[]'); } catch (err) { console.warn('[admin] failed to parse cached consultations', err); }
    setLocalLeads([...pending, ...consultations]);
    try {
      const rows = await supabaseRest.select('leads', '?select=*&order=created_at.desc&limit=100', token);
      setLeads(rows || []);
      toast({ title: 'Leads loaded', description: `${rows?.length || 0} Supabase leads found.` });
    } catch (e) {
      console.warn('[admin] loadLeads failed', e);
      toast({ title: 'Could not load Supabase leads', description: e.message || 'Check SQL policies/admin role.' });
    }
  }, [toast]);


  const loadPackages = useCallback(async () => {
    try {
      const rows = await loadFreezonePackages();
      setLivePackages(rows || []);
    } catch (e) {
      setLivePackages([]);
      toast({ title: 'Could not load live packages', description: e.message || 'Check freezone_packages read policy.' });
    }
  }, [toast]);

  const loadOrders = useCallback(async () => {
    const token = getToken();
    try {
      const rows = await supabaseRest.select('checkout_orders', '?select=*&order=created_at.desc&limit=100', token);
      setOrders(rows || []);
    } catch (e) {
      console.warn('[admin] loadOrders failed', e);
      setOrders([]);
      toast({ title: 'Could not load orders', description: e.message || 'Check admin role or Supabase policies.' });
    }
  }, [toast]);

  const loadRoles = useCallback(async () => {
    const token = getToken();
    try {
      const profiles = await supabaseRest.select('profiles', '?select=id,email,full_name,name,role,is_active,created_at&order=created_at.desc&limit=100', token).catch(() => []);
      const admins = await supabaseRest.select('admin_profiles', '?select=*&order=created_at.desc&limit=100', token).catch(() => []);
      const normalized = [...(profiles || []), ...(admins || [])].filter((r) => ADMIN_ROLES.includes(r.role));
      setRoleRows(normalized);
    } catch (e) {
      console.warn('[admin] loadRoles failed', e);
      setRoleRows([]);
      toast({ title: 'Could not load roles', description: e.message || 'Check admin role / RLS.' });
    }
  }, [toast]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await adminApi.listUsers();
      setUsers(response.users || []);
      if (!selectedUser && response.users?.length) {
        setSelectedUser(response.users[0]);
      }
    } catch (e) {
      console.warn('[admin] loadUsers failed', e);
      setUsers([]);
      toast({ title: 'Could not load team', description: e.message || 'Check admin role / backend.' });
    }
  }, [selectedUser, toast]);

  const chooseUser = (user) => {
    setSelectedUser(user);
    setUserEdit({
      new_password: '',
      new_role: user.role || 'staff',
      disable: user.is_active === false,
      full_name: user.full_name || '',
      assigned_manager: user.assigned_manager || '',
    });
  };

  const saveUserChanges = async () => {
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      const payload = {
        target_id: selectedUser.id,
        new_role: userEdit.new_role,
        full_name: userEdit.full_name,
        disable: userEdit.disable,
      };
      if (userEdit.new_password) payload.new_password = userEdit.new_password;
      await adminApi.updateUser(payload);
      toast({ title: 'User updated', description: `${selectedUser.email} saved.` });
      await loadUsers();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message || 'Review role permissions.' });
    } finally {
      setSavingUser(false);
    }
  };

  const loadActivities = useCallback(async () => {
    try {
      const rows = await supabaseRest.select('activities_master', '?select=id,freezone,activity_name,activity_code,industry_group,is_active&order=freezone.asc&limit=100');
      setActivities(rows || []);
    } catch (e) {
      // Admin can still use lead panel if activity policies are not open yet.
    }
  }, []);

  const updateFreezoneLocal = (id, key, value) => {
    setFreezones((prev) => prev.map((z) => (z.id === id ? { ...z, [key]: value } : z)));
    toast({ title: 'Local preview updated', description: 'For live pricing database edits, connect a pricing table later.' });
  };

  if (loading || !user) return null;

  if (!isAdmin) {
    return <div><Navbar /><section className="hero-gradient grain min-h-[60vh]"><div className="max-w-6xl mx-auto px-5 lg:px-8 py-20 text-center"><div className="text-2xl font-semibold text-slate-900">Admin access required</div><p className="mt-3 text-slate-600">You must be Admin, Manager, Staff or Reviewer.</p><Button onClick={() => navigate('/dashboard')} className="mt-6 rounded-full px-6 h-11">Go back</Button></div></section><Footer /></div>;
  }

  const allLeads = [...leads, ...localLeads.map((l, i) => ({ id: `local-${i}`, ...l, local_only: true }))];

  return (
    <div>
      <Navbar />
      <section className="hero-gradient grain">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-3 lg:pt-6 pb-9">
          <div className="text-[12px] uppercase tracking-[0.22em] text-slate-500 font-semibold">Admin Panel</div>
          <h1 className="mt-3 font-display font-semibold text-slate-900" style={{ fontSize: 'clamp(2.4rem, 4.4vw, 4rem)', lineHeight: 1.05 }}>Control tower — leads, orders &amp; ops.</h1>
          <p className="mt-3 text-slate-600 max-w-3xl" style={{ fontSize: 'clamp(1rem, 1.15vw, 1.125rem)' }}>Real-time KPIs · 50+ live leads · multi-currency payments · 12,719 indexed activities · 91 freezone packages. All synced with Supabase smrsaedmuaizlesehpee.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              ['overview', 'Overview'],
              ['leads', 'Leads'],
              ['orders', 'Orders'],
              ['coupons', 'Coupons'],
              ['memberships', 'Memberships'],
              ['kyc', 'KYC'],
              ['payments', 'Payment Proofs'],
              ['pricing', 'Pricing'],
              ['activities', 'Activities'],
              ['roles', 'Roles'],
              ['team', 'Team'],
            ].map(([k, label]) => (
              <Button
                key={k}
                onClick={() => setTab(k)}
                variant={tab === k ? 'default' : 'outline'}
                className="rounded-full px-4 h-10 text-xs"
                data-testid={`admin-tab-${k}`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 space-y-6">
          {tab === 'overview' && <AdminOverview />}
          {tab === 'leads' && (
            <div className="card-elevated rounded-3xl p-7">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Captured Leads</div><div className="mt-2 text-lg font-semibold text-slate-900">{allLeads.length} total shown</div></div>
                <div className="flex gap-2">
                  <Button onClick={() => downloadCsv('leads.csv', allLeads)} variant="outline" className="rounded-full px-4 h-9 text-xs">Export CSV</Button>
                  <Button onClick={loadLeads} variant="outline" className="rounded-full px-4 h-9 text-xs">Reload</Button>
                </div>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Date</th><th>Name</th><th>Phone</th><th>Email</th><th>Source</th><th>Activity / Message</th><th>Status</th></tr></thead>
                  <tbody>
                    {allLeads.map((l) => (
                      <tr key={l.id || `${l.name}-${l.phone_number}-${l.created_at}`} className="border-b border-slate-100">
                        <td className="py-3 text-slate-500">{l.created_at ? new Date(l.created_at).toLocaleString() : l.at ? new Date(l.at).toLocaleString() : '-'}</td>
                        <td className="font-medium text-slate-900">{l.name || '-'}</td>
                        <td>{[l.phone_country_code, l.phone_number || l.phone].filter(Boolean).join(' ') || '-'}</td>
                        <td>{l.email || '-'}</td>
                        <td>{l.source_page || l.source || '-'}</td>
                        <td className="max-w-[260px] truncate">{l.business_activity || l.activity || l.message || '-'}</td>
                        <td>{l.local_only ? (
                          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs">local-only</span>
                        ) : (
                          <select
                            defaultValue={l.status || 'new'}
                            onChange={async (e) => {
                              try { await updateLeadStatus(l.id, e.target.value); toast({ title: 'Status updated' }); loadLeads(); }
                              catch { toast({ title: 'Update failed' }); }
                            }}
                            className="text-xs rounded-md border border-slate-300 px-2 py-1"
                            data-testid={`lead-status-${l.id}`}
                          >
                            {['new','contacted','qualified','converted','lost'].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}</td>
                      </tr>
                    ))}
                    {allLeads.length === 0 && <tr><td colSpan="7" className="py-8 text-center text-slate-500">No leads yet. Submit any form and reload.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'pricing' && (
            <div className="card-elevated rounded-3xl p-7">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Live Pricing</div><div className="mt-2 text-lg font-semibold text-slate-900">{livePackages.length} Supabase package rows shown</div></div>
                <Button onClick={loadPackages} variant="outline" className="rounded-full px-5 h-10">Reload Packages</Button>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Free Zone</th><th>Package</th><th>Duration</th><th>Workspace</th><th>Base AED</th><th>Service AED</th><th>Status</th></tr></thead>
                  <tbody>
                    {livePackages.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-slate-100">
                        <td className="py-3 font-medium text-slate-900">{pkg.freezone_name}</td>
                        <td>{pkg.package_name}</td>
                        <td>{pkg.duration}</td>
                        <td>{pkg.workspace || '-'}</td>
                        <td>AED {Number(pkg.base_price || 0).toLocaleString()}</td>
                        <td>AED {Number(pkg.service_fee || 0).toLocaleString()}</td>
                        <td><span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">{pkg.is_active === false ? 'inactive' : 'active'}</span></td>
                      </tr>
                    ))}
                    {livePackages.length === 0 && <tr><td colSpan="7" className="py-8 text-center text-slate-500">No live packages loaded. Check freezone_packages RLS read policy.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <div className="card-elevated rounded-3xl p-7">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Checkout Orders</div><div className="mt-2 text-lg font-semibold text-slate-900">{orders.length} latest Supabase orders</div></div>
                <div className="flex gap-2">
                  <Button onClick={() => downloadCsv('orders.csv', orders)} variant="outline" className="rounded-full px-4 h-9 text-xs">Export CSV</Button>
                  <Button onClick={loadOrders} variant="outline" className="rounded-full px-4 h-9 text-xs">Reload</Button>
                </div>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Created</th><th>Ref</th><th>Customer</th><th>Zone</th><th>Total</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id || o.reference} className="border-b border-slate-100">
                        <td className="py-3 text-slate-500">{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                        <td className="font-mono font-semibold">{o.reference || o.id?.slice(0,8)}</td>
                        <td>{o.contact_name || o.contact_email || '-'}</td>
                        <td>{o.zone_name || '-'}</td>
                        <td>AED {Number(o.total_aed || 0).toLocaleString()}</td>
                        <td>
                          <select
                            defaultValue={o.status || 'new'}
                            onChange={async (e) => {
                              try { await updateOrderStatus(o.id, e.target.value); toast({ title: 'Status updated', description: `${o.reference} → ${e.target.value}` }); loadOrders(); }
                              catch { toast({ title: 'Update failed', description: 'Check admin role / RLS.' }); }
                            }}
                            className="text-xs rounded-md border border-slate-300 px-2 py-1"
                            data-testid={`order-status-${o.id}`}
                          >
                            {['new','payment_review','paid','docs_uploaded','submitted','issued','cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="text-xs text-slate-400">{o.notes ? '📝' : ''}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan="7" className="py-8 text-center text-slate-500">No orders.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'coupons' && (
            <div className="card-elevated rounded-3xl p-7" data-testid="admin-coupons">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Coupons</div><div className="mt-2 text-lg font-semibold text-slate-900">{coupons.length} total</div></div>
                <Button onClick={() => downloadCsv('coupons.csv', coupons)} variant="outline" className="rounded-full px-4 h-9 text-xs">Export CSV</Button>
              </div>
              <div className="mt-6 grid lg:grid-cols-[1fr_320px] gap-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Code</th><th>Type</th><th>Value</th><th>Used / Max</th><th>Active</th><th></th></tr></thead>
                    <tbody>
                      {coupons.map((c) => (
                        <tr key={c.id} className="border-b border-slate-100" data-testid={`coupon-row-${c.code}`}>
                          <td className="py-3 font-mono font-bold text-slate-900">{c.code}</td>
                          <td className="text-xs">{c.discount_type}</td>
                          <td className="font-semibold">{c.discount_type === 'percent' ? `${c.discount_value}%` : `AED ${c.discount_value}`}</td>
                          <td className="text-xs text-slate-500">{c.used_count || 0} / {c.max_uses || '∞'}</td>
                          <td>
                            <button
                              onClick={async () => { await updateCoupon(c.id, { is_active: !c.is_active }); loadCoupons(); }}
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                              data-testid={`coupon-toggle-${c.code}`}
                            >
                              {c.is_active ? 'Active' : 'Off'}
                            </button>
                          </td>
                          <td>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Delete coupon ${c.code}?`)) { await deleteCoupon(c.id); loadCoupons(); }
                              }}
                              className="text-rose-500 hover:text-rose-700 text-xs"
                              data-testid={`coupon-delete-${c.code}`}
                            >Delete</button>
                          </td>
                        </tr>
                      ))}
                      {coupons.length === 0 && <tr><td colSpan="6" className="py-8 text-center text-slate-500">No coupons. Run migration 0002 + create one →</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 h-fit" data-testid="coupon-create-form">
                  <div className="font-semibold text-slate-900 mb-3">New coupon</div>
                  <div className="space-y-2 text-xs">
                    <div><label className="text-slate-500">Code</label><Input value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} className="h-9 mt-1 uppercase" data-testid="coupon-input-code" /></div>
                    <div><label className="text-slate-500">Description</label><Input value={newCoupon.description} onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })} className="h-9 mt-1" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-500">Type</label>
                        <select value={newCoupon.discount_type} onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })} className="w-full h-9 mt-1 rounded-md border border-slate-300 text-xs px-2">
                          <option value="percent">%</option><option value="flat">AED</option>
                        </select>
                      </div>
                      <div><label className="text-slate-500">Value</label><Input type="number" value={newCoupon.discount_value} onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })} className="h-9 mt-1" /></div>
                    </div>
                    <div><label className="text-slate-500">Max uses (0 = ∞)</label><Input type="number" value={newCoupon.max_uses} onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: Number(e.target.value) })} className="h-9 mt-1" /></div>
                    <Button
                      onClick={async () => {
                        if (!newCoupon.code) return toast({ title: 'Code required' });
                        try { await createCoupon(newCoupon); toast({ title: 'Coupon created', description: newCoupon.code }); setNewCoupon({ code: '', description: '', discount_type: 'percent', discount_value: 5, max_uses: 0 }); loadCoupons(); }
                        catch (e) { toast({ title: 'Create failed', description: e.message || 'Check admin role / RLS' }); }
                      }}
                      className="btn-primary rounded-full w-full h-10 mt-2"
                      data-testid="coupon-create-btn"
                    >Create coupon</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'memberships' && (
            <div className="card-elevated rounded-3xl p-7" data-testid="admin-memberships">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Founder Club Memberships</div><div className="mt-2 text-lg font-semibold text-slate-900">{memberships.filter((m) => m.active).length} active · {memberships.length} total</div></div>
                <div className="flex gap-2">
                  <Button onClick={() => downloadCsv('memberships.csv', memberships)} variant="outline" className="rounded-full px-4 h-9 text-xs">Export CSV</Button>
                  <Button onClick={loadMemberships} variant="outline" className="rounded-full px-4 h-9 text-xs">Reload</Button>
                </div>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Email</th><th>Plan</th><th>Joined</th><th>Order Ref</th><th>Status</th></tr></thead>
                  <tbody>
                    {memberships.map((m) => (
                      <tr key={m.id} className="border-b border-slate-100">
                        <td className="py-3 font-medium text-slate-900">{m.user_email}</td>
                        <td className="text-xs">{m.plan}</td>
                        <td className="text-xs text-slate-500">{new Date(m.joined_at).toLocaleString()}</td>
                        <td className="font-mono text-xs">{m.order_reference || '-'}</td>
                        <td>
                          <button
                            onClick={async () => { await setMembershipActive(m.id, !m.active); loadMemberships(); }}
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${m.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                          >
                            {m.active ? 'Active' : 'Revoked'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {memberships.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-slate-500">No memberships. Run migration 0001 + sell some founder club.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'kyc' && (
            <div className="card-elevated rounded-3xl p-7" data-testid="admin-kyc">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">KYC Submissions</div><div className="mt-2 text-lg font-semibold text-slate-900">{kycRows.length} documents across {new Set(kycRows.map((k) => k.user_email)).size} users</div></div>
                <div className="flex gap-2">
                  <Button onClick={() => downloadCsv('kyc.csv', kycRows)} variant="outline" className="rounded-full px-4 h-9 text-xs">Export CSV</Button>
                  <Button onClick={loadKyc} variant="outline" className="rounded-full px-4 h-9 text-xs">Reload</Button>
                </div>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Uploaded</th><th>Email</th><th>Document</th><th>File</th><th>Size</th></tr></thead>
                  <tbody>
                    {kycRows.map((k) => (
                      <tr key={k.id} className="border-b border-slate-100">
                        <td className="py-3 text-slate-500 text-xs">{new Date(k.uploaded_at).toLocaleString()}</td>
                        <td className="font-medium text-slate-900">{k.user_email}</td>
                        <td className="text-xs uppercase tracking-wider font-semibold">{k.doc_key}</td>
                        <td className="text-xs truncate max-w-[260px]">{k.file_name}</td>
                        <td className="text-xs text-slate-500">{((k.file_size_bytes || 0) / 1024).toFixed(0)} KB</td>
                      </tr>
                    ))}
                    {kycRows.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-slate-500">No KYC uploads yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}



          {tab === 'payments' && <PaymentProofsTab />}



          {tab === 'activities' && (
            <div className="card-elevated rounded-3xl p-7">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Activities Master</div><div className="mt-2 text-lg font-semibold text-slate-900">{activities.length} latest activities shown</div></div>
                <Button onClick={loadActivities} variant="outline" className="rounded-full px-5 h-10">Reload Activities</Button>
              </div>
              <p className="mt-3 text-sm text-slate-600">This reads from Supabase table <b>activities_master</b>. Use this to confirm SPC, Mainland, RAKEZ, Meydan and other activity data is available before upload.</p>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Jurisdiction</th><th>Activity</th><th>Code</th><th>Industry</th><th>Active</th></tr></thead>
                  <tbody>
                    {activities.map((a) => (
                      <tr key={a.id || `${a.freezone}-${a.activity_code}-${a.activity_name}`} className="border-b border-slate-100">
                        <td className="py-3 font-medium text-slate-900">{a.freezone || '-'}</td>
                        <td>{a.activity_name || '-'}</td>
                        <td>{a.activity_code || '-'}</td>
                        <td>{a.industry_group || '-'}</td>
                        <td><span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">{a.is_active === false ? 'No' : 'Yes'}</span></td>
                      </tr>
                    ))}
                    {activities.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-slate-500">No activities loaded. Check RLS read policy for activities_master.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'roles' && (
            <div className="card-elevated rounded-3xl p-7">
              <div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Roles</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">Admin / Manager / Staff / Reviewer</div>
              <p className="mt-3 text-slate-600">Roles are read from Supabase profiles/admin_profiles. Server-side RLS must still enforce permissions; the UI does not replace database policies.</p>
              <div className="mt-5 overflow-x-auto"><table className="w-full text-sm min-w-[700px]"><thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Name</th><th>Email</th><th>Role</th><th>Active</th></tr></thead><tbody>{roleRows.map((r) => <tr key={r.id || r.user_id || r.email} className="border-b border-slate-100"><td className="py-3 font-medium text-slate-900">{r.full_name || r.name || '-'}</td><td>{r.email || '-'}</td><td>{r.role}</td><td>{r.is_active === false ? 'No' : 'Yes'}</td></tr>)}{roleRows.length === 0 && <tr><td colSpan="4" className="py-8 text-center text-slate-500">No admin role rows loaded. Check profiles/admin_profiles read policy.</td></tr>}</tbody></table></div>
            </div>
          )}

          {tab === 'team' && (
            <div className="card-elevated rounded-3xl p-7">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Team management</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">Admin user operations</div>
                  <p className="mt-3 text-slate-600 max-w-3xl">View your active staff and reviewer team, update access, rotate passwords, and disable accounts without multiple systems.</p>
                </div>
                <Button onClick={loadUsers} variant="outline" className="rounded-full px-5 h-10">Refresh team</Button>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="text-left text-slate-500 border-b">
                        <th className="py-3">Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Manager</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className={`border-b border-slate-100 ${selectedUser?.id === u.id ? 'bg-slate-50' : ''}`}>
                          <td className="py-3 font-medium text-slate-900">{u.full_name || u.email.split('@')[0]}</td>
                          <td>{u.email}</td>
                          <td>{u.role}</td>
                          <td>{u.assigned_manager || '-'}</td>
                          <td><span className={`px-2 py-1 rounded-full text-xs ${u.is_active === false ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{u.is_active === false ? 'Disabled' : 'Active'}</span></td>
                          <td>
                            <button
                              onClick={() => chooseUser(u)}
                              className="text-[11px] text-slate-600 hover:text-slate-900"
                            >Manage</button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan="6" className="py-8 text-center text-slate-500">No team members available. Ensure the backend /api/admin/users endpoint is accessible.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-3xl bg-slate-50 p-6">
                  <div className="font-semibold text-slate-900">Selected user</div>
                  {selectedUser ? (
                    <div className="space-y-4 mt-4">
                      <div className="text-sm text-slate-600">{selectedUser.full_name || selectedUser.email}</div>
                      <div className="space-y-3 text-sm text-slate-700">
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-slate-500">Full name</label>
                          <Input value={userEdit.full_name} onChange={(e) => setUserEdit({ ...userEdit, full_name: e.target.value })} className="mt-1 h-11 rounded-lg" />
                        </div>
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-slate-500">Role</label>
                          <select value={userEdit.new_role} onChange={(e) => setUserEdit({ ...userEdit, new_role: e.target.value })} className="w-full h-11 mt-1 rounded-lg border border-slate-300 px-3 text-sm">
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="client">Client</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-slate-500">Assigned manager</label>
                          <Input value={userEdit.assigned_manager} onChange={(e) => setUserEdit({ ...userEdit, assigned_manager: e.target.value })} className="mt-1 h-11 rounded-lg" placeholder="Manager ID" />
                        </div>
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-slate-500">Reset password</label>
                          <Input type="password" value={userEdit.new_password} onChange={(e) => setUserEdit({ ...userEdit, new_password: e.target.value })} className="mt-1 h-11 rounded-lg" placeholder="New password" />
                        </div>
                        <div className="flex items-center gap-3">
                          <input id="disable-user" type="checkbox" checked={userEdit.disable} onChange={(e) => setUserEdit({ ...userEdit, disable: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                          <label htmlFor="disable-user" className="text-sm text-slate-700">Disable this account</label>
                        </div>
                      </div>
                      <Button onClick={saveUserChanges} disabled={savingUser} className="btn-primary rounded-full w-full h-12">
                        {savingUser ? 'Saving…' : 'Save user changes'}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 text-slate-500">Select a team member to update their role, password or status.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

// --------- Admin Overview tab — KPI stats + seed/cleanup actions ---------
function AdminOverview() {
  const { toast } = useToast();
  const [stats, setStats] = React.useState(null);
  const [seeding, setSeeding] = React.useState(false);
  const load = React.useCallback(async () => {
    try { setStats(await adminApi.stats()); }
    catch (e) { toast({ title: 'Stats load failed', description: e.message || 'Check admin role.' }); }
  }, [toast]);
  React.useEffect(() => { load(); }, [load]);

  const seed = async () => {
    setSeeding(true);
    try {
      const r = await adminApi.seedDummy();
      toast({ title: 'Dummy data seeded', description: `${r.leads_inserted} leads · ${r.completed_companies} companies · ${r.founder_members} founder club · ${r.appointments} appointments` });
      await load();
    } catch (e) {
      toast({ title: 'Seed failed', description: e.message || 'Need admin role.' });
    } finally { setSeeding(false); }
  };
  const cleanup = async () => {
    if (!window.confirm('Delete all rows tagged TEST_DATA?')) return;
    try {
      await adminApi.cleanupDummy();
      toast({ title: 'Dummy data cleared' });
      await load();
    } catch (e) {
      toast({ title: 'Cleanup failed', description: e.message });
    }
  };

  const cards = stats ? [
    { l: 'Leads (total)',         n: stats.leads.total, sub: `${stats.leads.new} new · ${stats.leads.converted} converted` },
    { l: 'Orders',                n: stats.orders.total, sub: `${stats.orders.paid} paid` },
    { l: 'Founder Club Members',  n: stats.founder_club.active, sub: 'Active' },
    { l: 'Freezone Packages',     n: stats.freezone_packages, sub: 'Live · across 10 zones' },
    { l: 'Activities Master',     n: stats.activities, sub: 'Searchable' },
    { l: 'Golden Visa Leads',     n: stats.golden_visa_leads, sub: 'Via /golden-visa form' },
    { l: 'Appointments',          n: stats.appointments, sub: 'Medical · Bio · Stamping' },
  ] : [];

  return (
    <div className="space-y-6" data-testid="admin-overview">
      <div className="card-elevated rounded-3xl p-7">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Platform KPIs</div>
            <div className="mt-1 font-display text-2xl font-semibold text-slate-900">SmartSetupUAE Control Tower</div>
          </div>
          <div className="flex gap-2">
            <Button onClick={seed} disabled={seeding} className="rounded-full px-4 h-9 text-xs bg-emerald-700 text-white hover:bg-emerald-800" data-testid="admin-seed-dummy">{seeding ? 'Seeding…' : 'Seed 50 dummy leads + companies'}</Button>
            <Button onClick={cleanup} variant="outline" className="rounded-full px-4 h-9 text-xs" data-testid="admin-cleanup-dummy">Delete TEST_DATA</Button>
            <Button onClick={load} variant="outline" className="rounded-full px-4 h-9 text-xs">Refresh</Button>
          </div>
        </div>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((c) => (
            <div key={c.l} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{c.l}</div>
              <div className="font-display text-3xl font-bold text-slate-900 mt-1">{Number(c.n).toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Payment Proofs admin tab — reviews bank-transfer proof uploads from
   /payment-proof public page. Approve / reject sets payment_proofs.status
   in Supabase which the audit table monitors via RLS.
   ────────────────────────────────────────────────────────────────────── */
function PaymentProofsTab() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listPaymentProofs(filter === 'all' ? {} : { status: filter });
      setItems(rows || []);
    } catch (e) {
      toast({ title: 'Failed to load proofs', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const view = async (row) => {
    try {
      const url = await signProofUrl({ path: row.file_path });
      setViewing({ ...row, signedUrl: url });
    } catch (e) {
      toast({ title: 'Cannot open file', description: e.message, variant: 'destructive' });
    }
  };

  const setStatus = async (row, status) => {
    try {
      await updateProofStatus({ id: row.id, status, reviewer: 'admin' });
      toast({ title: `Proof ${status}` });
      load();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="card-elevated rounded-3xl p-7" data-testid="admin-payment-proofs">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Bank Transfer Proofs</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{items.length} proof{items.length === 1 ? '' : 's'} {filter !== 'all' ? `(${filter})` : ''}</div>
        </div>
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected', 'all'].map((s) => (
            <Button key={s} variant={filter === s ? 'default' : 'outline'} className="rounded-full px-3 h-9 text-xs capitalize" onClick={() => setFilter(s)} data-testid={`payment-proof-filter-${s}`}>{s}</Button>
          ))}
          <Button variant="outline" className="rounded-full px-4 h-9 text-xs" onClick={load} data-testid="payment-proof-refresh">{loading ? 'Loading…' : 'Refresh'}</Button>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-3">Uploaded</th>
              <th>Order ref</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Customer</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="py-3 text-slate-500">{p.uploaded_at ? new Date(p.uploaded_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</td>
                <td className="font-mono text-xs">{p.order_ref || p.order_id || '-'}</td>
                <td className="font-semibold">{Number(p.amount || 0).toLocaleString()}</td>
                <td>{p.currency || 'AED'}</td>
                <td className="text-slate-700">{p.customer_email || p.customer_name || '-'}</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${p.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : p.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{p.status || 'pending'}</span>
                </td>
                <td className="text-right">
                  <div className="inline-flex gap-1.5">
                    <Button variant="outline" className="rounded-full h-8 px-3 text-xs" onClick={() => view(p)}>View</Button>
                    {p.status !== 'approved' && (
                      <Button className="rounded-full h-8 px-3 text-xs bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => setStatus(p, 'approved')}>Approve</Button>
                    )}
                    {p.status !== 'rejected' && (
                      <Button variant="outline" className="rounded-full h-8 px-3 text-xs border-red-400 text-red-700 hover:bg-red-50" onClick={() => setStatus(p, 'rejected')}>Reject</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && !loading && (
              <tr><td colSpan={7} className="py-10 text-center text-slate-400">No proofs in this view</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm grid place-items-center p-6" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-900">Proof · {viewing.order_ref || viewing.id}</div>
              <Button variant="outline" className="rounded-full h-8 px-3 text-xs" onClick={() => setViewing(null)}>Close</Button>
            </div>
            {viewing.signedUrl?.match(/\.(png|jpe?g|webp)$/i) ? (
              <img src={viewing.signedUrl} alt="Payment proof" className="max-h-[70vh] mx-auto rounded-xl border border-slate-200" />
            ) : (
              <iframe src={viewing.signedUrl} title="proof" className="w-full h-[70vh] rounded-xl border border-slate-200" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
