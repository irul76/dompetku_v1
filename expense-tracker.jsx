import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "expense-tracker-data";

const formatRupiah = (n) =>
  "Rp " + Number(n).toLocaleString("id-ID");

const CATEGORIES = [
  { id: "makan", label: "🍜 Makan & Minum", color: "#f97316" },
  { id: "transport", label: "🚗 Transportasi", color: "#3b82f6" },
  { id: "belanja", label: "🛒 Belanja", color: "#a855f7" },
  { id: "tagihan", label: "💡 Tagihan", color: "#ef4444" },
  { id: "hiburan", label: "🎮 Hiburan", color: "#22c55e" },
  { id: "kesehatan", label: "💊 Kesehatan", color: "#06b6d4" },
  { id: "pendidikan", label: "📚 Pendidikan", color: "#f59e0b" },
  { id: "lainnya", label: "📦 Lainnya", color: "#6b7280" },
];

const getCatColor = (id) =>
  CATEGORIES.find((c) => c.id === id)?.color || "#6b7280";
const getCatLabel = (id) =>
  CATEGORIES.find((c) => c.id === id)?.label || id;

function MonthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

const MONTHS_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

export default function App() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  // Data shape: { budgets: { "2025-06": 5000000 }, expenses: [ {...} ] }
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : { budgets: {}, expenses: [] };
    } catch { return { budgets: {}, expenses: [] }; }
  });

  // Persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch {}
  }, [data]);

  const monthKey = MonthKey(viewYear, viewMonth);
  const budget = data.budgets[monthKey] || 0;
  const expenses = data.expenses.filter((e) => e.monthKey === monthKey);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget - totalSpent;

  // Category breakdown
  const catBreakdown = CATEGORIES.map((cat) => {
    const total = expenses
      .filter((e) => e.category === cat.id)
      .reduce((s, e) => s + e.amount, 0);
    return { ...cat, total };
  }).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  const topCategory = catBreakdown[0] || null;

  // Form states
  const [budgetInput, setBudgetInput] = useState("");
  const [expForm, setExpForm] = useState({
    desc: "", amount: "", category: "makan", date: new Date().toISOString().slice(0, 10),
  });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const saveBudget = () => {
    const val = parseInt(budgetInput.replace(/\D/g, ""));
    if (!val || val <= 0) return;
    setData((d) => ({ ...d, budgets: { ...d.budgets, [monthKey]: val } }));
    setBudgetInput("");
    setShowBudgetModal(false);
  };

  const addExpense = () => {
    const amt = parseInt(expForm.amount.replace(/\D/g, ""));
    if (!expForm.desc.trim() || !amt || amt <= 0) return;
    const newExp = {
      id: Date.now(),
      monthKey,
      desc: expForm.desc.trim(),
      amount: amt,
      category: expForm.category,
      date: expForm.date,
    };
    setData((d) => ({ ...d, expenses: [newExp, ...d.expenses] }));
    setExpForm({ desc: "", amount: "", category: "makan", date: new Date().toISOString().slice(0, 10) });
    setShowExpModal(false);
  };

  const deleteExpense = (id) => {
    setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }));
    setDeleteId(null);
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
  };

  const pct = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f97316" : "#22c55e";

  // Sort expenses by date desc
  const sortedExp = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Export JSON
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pengeluaran-${monthKey}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed.expenses && parsed.budgets) setData(parsed);
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={styles.root}>
      <style>{cssGlobal}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>💰</span>
            <div>
              <div style={styles.logoTitle}>DompetKu</div>
              <div style={styles.logoSub}>Pencatat Keuangan Pribadi</div>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button className="btn-ghost" onClick={exportData} title="Export JSON">
              ⬇ Export
            </button>
            <label className="btn-ghost" style={{ cursor: "pointer" }} title="Import JSON">
              ⬆ Import
              <input type="file" accept=".json" style={{ display: "none" }} onChange={importData} />
            </label>
          </div>
        </div>
      </header>

      {/* Month nav */}
      <div style={styles.monthNav}>
        <button className="btn-circle" onClick={prevMonth}>‹</button>
        <div style={styles.monthLabel}>
          <span style={styles.monthName}>{MONTHS_ID[viewMonth - 1]}</span>
          <span style={styles.monthYear}>{viewYear}</span>
        </div>
        <button className="btn-circle" onClick={nextMonth}>›</button>
      </div>

      {/* Budget summary card */}
      <div style={styles.summaryGrid}>
        <div style={{ ...styles.summaryCard, borderColor: "#22c55e22" }}>
          <div style={styles.summaryLabel}>Anggaran Bulan Ini</div>
          <div style={{ ...styles.summaryValue, color: "#22c55e" }}>{budget > 0 ? formatRupiah(budget) : "—"}</div>
          <button className="btn-sm" onClick={() => { setBudgetInput(budget ? String(budget) : ""); setShowBudgetModal(true); }}>
            {budget > 0 ? "Ubah" : "Set Anggaran"}
          </button>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: "#ef444422" }}>
          <div style={styles.summaryLabel}>Total Pengeluaran</div>
          <div style={{ ...styles.summaryValue, color: "#ef4444" }}>{formatRupiah(totalSpent)}</div>
          <div style={styles.summaryMeta}>{expenses.length} transaksi</div>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: remaining < 0 ? "#ef444422" : "#3b82f622" }}>
          <div style={styles.summaryLabel}>Sisa Anggaran</div>
          <div style={{ ...styles.summaryValue, color: remaining < 0 ? "#ef4444" : "#3b82f6" }}>
            {budget > 0 ? formatRupiah(remaining) : "—"}
          </div>
          {remaining < 0 && <div style={{ color: "#ef4444", fontSize: 12 }}>⚠ Melebihi anggaran!</div>}
        </div>
      </div>

      {/* Progress bar */}
      {budget > 0 && (
        <div style={styles.progressWrap}>
          <div style={styles.progressBg}>
            <div style={{ ...styles.progressFill, width: `${pct}%`, background: barColor }} className="progress-anim" />
          </div>
          <div style={styles.progressLabel}>{pct.toFixed(1)}% terpakai</div>
        </div>
      )}

      {/* Tab nav */}
      <div style={styles.tabs}>
        {["dashboard", "pengeluaran", "statistik"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? " active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "dashboard" ? "🏠 Ringkasan" : tab === "pengeluaran" ? "📋 Transaksi" : "📊 Statistik"}
          </button>
        ))}
      </div>

      {/* Content */}
      <main style={styles.main}>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div>
            {topCategory && (
              <div style={styles.topCatCard}>
                <div style={styles.topCatBadge}>🏆 Pengeluaran Terbesar</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                  <div style={{ ...styles.catDot, background: topCategory.color, width: 42, height: 42, fontSize: 20, borderRadius: 12 }}>
                    {topCategory.label.split(" ")[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{topCategory.label.slice(3)}</div>
                    <div style={{ color: topCategory.color, fontWeight: 800, fontSize: 18 }}>{formatRupiah(topCategory.total)}</div>
                    {budget > 0 && (
                      <div style={{ fontSize: 12, color: "#888" }}>
                        {((topCategory.total / budget) * 100).toFixed(1)}% dari anggaran
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div style={styles.sectionTitle}>Transaksi Terbaru</div>
            {sortedExp.slice(0, 5).length === 0 ? (
              <div style={styles.empty}>Belum ada pengeluaran bulan ini.<br />Tambahkan transaksi pertamamu! ✨</div>
            ) : (
              sortedExp.slice(0, 5).map((e) => <ExpRow key={e.id} e={e} onDelete={setDeleteId} />)
            )}
            {sortedExp.length > 5 && (
              <button className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setActiveTab("pengeluaran")}>
                Lihat semua {sortedExp.length} transaksi →
              </button>
            )}
          </div>
        )}

        {/* PENGELUARAN TAB */}
        {activeTab === "pengeluaran" && (
          <div>
            <div style={styles.sectionTitle}>Semua Transaksi</div>
            {sortedExp.length === 0 ? (
              <div style={styles.empty}>Belum ada pengeluaran bulan ini.</div>
            ) : (
              sortedExp.map((e) => <ExpRow key={e.id} e={e} onDelete={setDeleteId} />)
            )}
          </div>
        )}

        {/* STATISTIK TAB */}
        {activeTab === "statistik" && (
          <div>
            <div style={styles.sectionTitle}>Breakdown Kategori</div>
            {catBreakdown.length === 0 ? (
              <div style={styles.empty}>Belum ada data statistik.</div>
            ) : (
              catBreakdown.map((cat) => (
                <div key={cat.id} style={styles.statRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{cat.label.split(" ")[0]}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{cat.label.slice(3)}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        {expenses.filter((e) => e.category === cat.id).length} transaksi
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: cat.color }}>{formatRupiah(cat.total)}</div>
                    {budget > 0 && (
                      <div style={{ fontSize: 12, color: "#888" }}>
                        {((cat.total / budget) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <div style={styles.miniBarBg}>
                      <div
                        className="progress-anim"
                        style={{
                          ...styles.miniBarFill,
                          width: `${totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0}%`,
                          background: cat.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        className="fab"
        onClick={() => setShowExpModal(true)}
        title="Tambah Pengeluaran"
      >
        +
      </button>

      {/* Budget Modal */}
      {showBudgetModal && (
        <Modal onClose={() => setShowBudgetModal(false)} title="Set Anggaran Bulan Ini">
          <div style={styles.formGroup}>
            <label style={styles.label}>Anggaran ({MONTHS_ID[viewMonth - 1]} {viewYear})</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Contoh: 3000000"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && saveBudget()}
              autoFocus
            />
            {budgetInput && (
              <div style={styles.inputPreview}>{formatRupiah(budgetInput)}</div>
            )}
          </div>
          <button className="btn-primary" onClick={saveBudget} style={{ width: "100%" }}>
            Simpan Anggaran
          </button>
        </Modal>
      )}

      {/* Expense Modal */}
      {showExpModal && (
        <Modal onClose={() => setShowExpModal(false)} title="Tambah Pengeluaran">
          <div style={styles.formGroup}>
            <label style={styles.label}>Keterangan</label>
            <input
              style={styles.input}
              placeholder="Makan siang, bensin, dll..."
              value={expForm.desc}
              onChange={(e) => setExpForm((f) => ({ ...f, desc: e.target.value }))}
              autoFocus
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Jumlah (Rp)</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Contoh: 25000"
              value={expForm.amount}
              onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value.replace(/\D/g, "") }))}
            />
            {expForm.amount && (
              <div style={styles.inputPreview}>{formatRupiah(expForm.amount)}</div>
            )}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Kategori</label>
            <div style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`cat-btn${expForm.category === cat.id ? " selected" : ""}`}
                  style={{ "--cat-color": cat.color }}
                  onClick={() => setExpForm((f) => ({ ...f, category: cat.id }))}
                >
                  <span>{cat.label.split(" ")[0]}</span>
                  <span style={{ fontSize: 10 }}>{cat.label.slice(3)}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tanggal</label>
            <input
              style={styles.input}
              type="date"
              value={expForm.date}
              onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <button className="btn-primary" onClick={addExpense} style={{ width: "100%" }}>
            Tambah Pengeluaran
          </button>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <Modal onClose={() => setDeleteId(null)} title="Hapus Transaksi?">
          <p style={{ color: "#888", marginBottom: 20 }}>Transaksi ini akan dihapus permanen.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>Batal</button>
            <button className="btn-danger" style={{ flex: 1 }} onClick={() => deleteExpense(deleteId)}>Hapus</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ExpRow({ e, onDelete }) {
  const catColor = getCatColor(e.category);
  const catLabel = getCatLabel(e.category);
  const d = new Date(e.date);
  const dateStr = `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`;
  return (
    <div style={styles.expRow} className="exp-row">
      <div style={{ ...styles.catDot, background: catColor }}>
        {catLabel.split(" ")[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.expDesc}>{e.desc}</div>
        <div style={styles.expMeta}>{catLabel.slice(3)} · {dateStr}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ ...styles.expAmount, color: catColor }}>{formatRupiah(e.amount)}</div>
        <button
          className="btn-del"
          onClick={() => onDelete(e.id)}
          title="Hapus"
        >×</button>
      </div>
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal} className="modal-anim">
        <div style={styles.modalHeader}>
          <div style={styles.modalTitle}>{title}</div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0f1117",
    color: "#f0f0f0",
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
    paddingBottom: 100,
  },
  header: {
    background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)",
    borderBottom: "1px solid #ffffff0f",
    padding: "16px 20px",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerInner: { display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 640, margin: "0 auto" },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoIcon: { fontSize: 32 },
  logoTitle: { fontWeight: 800, fontSize: 18, letterSpacing: -0.5 },
  logoSub: { fontSize: 11, color: "#888", letterSpacing: 0.3 },
  headerActions: { display: "flex", gap: 8 },
  monthNav: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 20, padding: "20px 20px 10px", maxWidth: 640, margin: "0 auto",
  },
  monthLabel: { display: "flex", flexDirection: "column", alignItems: "center" },
  monthName: { fontWeight: 800, fontSize: 22, letterSpacing: -0.5 },
  monthYear: { fontSize: 13, color: "#888" },
  summaryGrid: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10, padding: "0 16px", maxWidth: 640, margin: "10px auto 0",
  },
  summaryCard: {
    background: "#1a1f2e",
    border: "1.5px solid",
    borderRadius: 16,
    padding: "14px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  summaryLabel: { fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { fontWeight: 800, fontSize: 14, lineHeight: 1.2 },
  summaryMeta: { fontSize: 11, color: "#666" },
  progressWrap: { maxWidth: 640, margin: "16px auto 0", padding: "0 16px" },
  progressBg: { height: 8, background: "#ffffff10", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99, transition: "width 0.6s ease" },
  progressLabel: { fontSize: 11, color: "#888", marginTop: 5, textAlign: "right" },
  tabs: {
    display: "flex", gap: 4, padding: "16px 16px 0",
    maxWidth: 640, margin: "0 auto",
  },
  main: { maxWidth: 640, margin: "0 auto", padding: "16px" },
  sectionTitle: { fontWeight: 800, fontSize: 14, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  topCatCard: {
    background: "linear-gradient(135deg, #1a1f2e, #12161f)",
    border: "1.5px solid #ffffff10",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  topCatBadge: { fontSize: 11, color: "#f59e0b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  catDot: { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 },
  expRow: {
    display: "flex", alignItems: "center", gap: 12,
    background: "#1a1f2e",
    border: "1px solid #ffffff08",
    borderRadius: 14,
    padding: "12px 14px",
    marginBottom: 8,
    transition: "all 0.2s",
  },
  expDesc: { fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  expMeta: { fontSize: 12, color: "#666", marginTop: 2 },
  expAmount: { fontWeight: 800, fontSize: 14 },
  statRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "8px 0",
    background: "#1a1f2e",
    border: "1px solid #ffffff08",
    borderRadius: 14,
    padding: "12px 14px",
    marginBottom: 8,
  },
  miniBarBg: { height: 4, background: "#ffffff0a", borderRadius: 99, overflow: "hidden" },
  miniBarFill: { height: "100%", borderRadius: 99, transition: "width 0.6s ease" },
  empty: { textAlign: "center", color: "#555", padding: "40px 0", lineHeight: 1.8 },
  overlay: {
    position: "fixed", inset: 0, background: "#000000cc", backdropFilter: "blur(8px)",
    display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000, padding: 16,
  },
  modal: {
    background: "#1a1f2e",
    border: "1.5px solid #ffffff12",
    borderRadius: "24px 24px 20px 20px",
    padding: 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontWeight: 800, fontSize: 18 },
  formGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input: {
    width: "100%", background: "#0f1117", border: "1.5px solid #ffffff12",
    borderRadius: 12, padding: "11px 14px", color: "#f0f0f0",
    fontSize: 15, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  inputPreview: { fontSize: 13, color: "#22c55e", marginTop: 5, fontWeight: 700 },
  catGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
};

const cssGlobal = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0f1117; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 99px; }
.btn-ghost { background: #ffffff08; border: 1px solid #ffffff10; color: #ccc; border-radius: 10px; padding: 7px 14px; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.2s; font-weight: 700; }
.btn-ghost:hover { background: #ffffff14; color: #fff; }
.btn-sm { background: #ffffff08; border: 1px solid #ffffff10; color: #aaa; border-radius: 8px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: inherit; font-weight: 700; margin-top: 4px; }
.btn-sm:hover { background: #ffffff14; color: #fff; }
.btn-primary { background: linear-gradient(135deg, #22c55e, #16a34a); border: none; color: #fff; border-radius: 14px; padding: 14px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: inherit; transition: all 0.2s; letter-spacing: 0.3px; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-danger { background: #ef4444; border: none; color: #fff; border-radius: 12px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-close { background: #ffffff08; border: none; color: #888; border-radius: 8px; width: 32px; height: 32px; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-close:hover { color: #fff; background: #ffffff14; }
.btn-circle { background: #1a1f2e; border: 1.5px solid #ffffff10; color: #fff; border-radius: 50%; width: 38px; height: 38px; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.btn-circle:hover { background: #ffffff14; }
.btn-del { background: none; border: none; color: #555; font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 6px; display: block; margin-top: 3px; margin-left: auto; }
.btn-del:hover { color: #ef4444; background: #ef444415; }
.tab-btn { flex: 1; background: #ffffff06; border: 1.5px solid transparent; color: #888; border-radius: 12px; padding: 10px 6px; font-size: 12px; font-weight: 800; cursor: pointer; font-family: inherit; transition: all 0.2s; }
.tab-btn.active { background: #1a1f2e; border-color: #ffffff15; color: #f0f0f0; }
.tab-btn:hover:not(.active) { color: #ccc; background: #ffffff0a; }
.cat-btn { background: #0f1117; border: 2px solid #ffffff0a; color: #999; border-radius: 12px; padding: 8px 4px; font-size: 13px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 3px; transition: all 0.2s; font-family: inherit; }
.cat-btn.selected { border-color: var(--cat-color); color: var(--cat-color); background: color-mix(in srgb, var(--cat-color) 10%, transparent); }
.cat-btn:hover { border-color: var(--cat-color); }
.exp-row:hover { border-color: #ffffff14; transform: translateY(-1px); }
.fab { position: fixed; bottom: 28px; right: 24px; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #22c55e, #16a34a); border: none; color: #fff; font-size: 30px; font-weight: 300; cursor: pointer; box-shadow: 0 8px 24px #22c55e40; transition: all 0.2s; z-index: 500; display: flex; align-items: center; justify-content: center; }
.fab:hover { transform: scale(1.08); box-shadow: 0 12px 32px #22c55e55; }
.progress-anim { transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-anim { animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
input:focus { border-color: #22c55e !important; }
`;
