// Filename: WarehouseSuppliesScreen.web.js
// Web-friendly Warehouse Supplies screen converted from React Native

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { IoArrowBack, IoCloseCircle, IoPencilOutline, IoTrendingUpOutline, IoTrashOutline, IoAdd, IoSearchOutline } from 'react-icons/io5';

import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function WarehouseSuppliesScreenWeb({ route = {} }) {
  const { warehouse = {}, canEdit = false, currencyUnit: initialCurrency = '₹' } = route.params || {};
  
  const navigation = useNavigation();

  const [supplies, setSupplies] = useState(warehouse.supplies || []);
  const [filteredSupplies, setFilteredSupplies] = useState(warehouse.supplies || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currencyUnit, setCurrencyUnit] = useState(initialCurrency);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importedData, setImportedData] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [formData, setFormData] = useState({ itemName: '', quantity: '', unit: '', entryPrice: '', currentPrice: '' });

  const { API_BASE_URL, user } = useAuth();

  const styleSheet = `
    .form-input:focus { border-color: #E69138; box-shadow: 0 0 0 3px rgba(230, 145, 56, 0.2); }
    .form-input:disabled { background-color: #f1f5f9; color: #9ca3af; cursor: not-allowed; }
    .form-button-primary:hover { background-color: #D48806; }
    .form-button-secondary:hover { background-color: #e2e8f0; }
    .form-button-primary:disabled { background-color: #f4c078; cursor: not-allowed; }
  `;

  useEffect(() => {
    const saved = localStorage.getItem(`warehouseCurrency_${warehouse._id}`) || localStorage.getItem('supplyCurrency');
    if (saved) setCurrencyUnit(saved);
  }, [warehouse._id]);

  useEffect(() => {
    if (searchQuery.trim() === '') setFilteredSupplies(supplies);
    else handleSearch(searchQuery);
  }, [supplies]);

  const normalizeItemName = (name) => {
    if (!name) return '';
    let normalized = name.toLowerCase().trim();
    if (normalized.endsWith('es')) normalized = normalized.slice(0, -2);
    else if (normalized.endsWith('s') && !normalized.endsWith('ss')) normalized = normalized.slice(0, -1);
    normalized = normalized.replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    return normalized;
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    const qq = q.trim().toLowerCase();
    if (!qq) return setFilteredSupplies(supplies);
    const filtered = supplies.filter(s => (s.itemName || '').toLowerCase().includes(qq));
    setFilteredSupplies(filtered);
  };

  const clearSearch = () => { setSearchQuery(''); setFilteredSupplies(supplies); };

  const fetchSupplies = async () => {
    if (!API_BASE_URL) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/warehouses/${warehouse._id}?userId=${user.id}`);
      if (res.data?.success) {
        setSupplies(res.data.data.supplies || []);
      }
    } catch (err) {
      console.error('fetchSupplies error', err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSupplies(); }, []);

  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileName = file.name || '';
    const ext = fileName.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      alert('Please select a CSV or Excel file');
      return;
    }

    setIsImporting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      let workbook;
      if (ext === 'csv') {
        const text = new TextDecoder('utf-8').decode(arrayBuffer);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        const data = new Uint8Array(arrayBuffer);
        workbook = XLSX.read(data, { type: 'array' });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        alert('File contains no data rows');
        setIsImporting(false);
        return;
      }

      const validItemNameColumns = ['itemName', 'Item Name', 'item_name', 'Item', 'Name', 'Product'];
      const validQuantityColumns = ['quantity', 'Quantity', 'Qty', 'qty', 'Amount'];
      const validUnitColumns = ['unit', 'Unit', 'Units', 'UOM'];
      const validPriceColumns = ['entryPrice', 'Entry Price', 'Price', 'price', 'Current Price', 'current_price', 'Unit Price', 'unit_price', 'Cost', 'cost'];

      const headers = Object.keys(jsonData[0]);
      const hasItemNameColumn = headers.some(h => validItemNameColumns.includes(h));
      const hasQuantityColumn = headers.some(h => validQuantityColumns.includes(h));
      const hasUnitColumn = headers.some(h => validUnitColumns.includes(h));
      const hasPriceColumn = headers.some(h => validPriceColumns.includes(h));

      if (!hasItemNameColumn || !hasQuantityColumn || !hasUnitColumn || !hasPriceColumn) {
        const missing = [];
        if (!hasItemNameColumn) missing.push('Item Name');
        if (!hasQuantityColumn) missing.push('Quantity');
        if (!hasUnitColumn) missing.push('Unit');
        if (!hasPriceColumn) missing.push('Price');
        alert(`Invalid file format. Missing: ${missing.join(', ')}\nFound: ${headers.join(', ')}`);
        setIsImporting(false);
        return;
      }

      const itemMap = new Map();
      const invalidRows = [];

      jsonData.forEach((row, idx) => {
        let itemName = '';
        for (const c of validItemNameColumns) if (row[c]) { itemName = String(row[c]).trim(); break; }
        let quantity = 0;
        for (const c of validQuantityColumns) if (row[c] !== undefined && row[c] !== null && row[c] !== '') { quantity = parseFloat(row[c]); break; }
        let unit = 'pcs';
        for (const c of validUnitColumns) if (row[c]) { unit = String(row[c]).trim(); break; }
        let price = null;
        for (const c of validPriceColumns) if (row[c] !== undefined && row[c] !== null && row[c] !== '') { price = parseFloat(row[c]); break; }

        if (!itemName) { invalidRows.push({ row: idx + 2, reason: 'Missing item name' }); return; }
        if (isNaN(quantity) || quantity <= 0) { invalidRows.push({ row: idx + 2, reason: 'Invalid or missing quantity' }); return; }
        if (price === null || isNaN(price) || price < 0) { invalidRows.push({ row: idx + 2, reason: 'Missing or invalid price' }); return; }

        const normalized = normalizeItemName(itemName);
        if (itemMap.has(normalized)) {
          const ex = itemMap.get(normalized);
          ex.quantity += quantity;
          ex.mergedFromFile = true;
          if (price > ex.currentPrice) ex.currentPrice = price;
        } else {
          itemMap.set(normalized, { itemName, quantity, unit, currentPrice: price, normalizedName: normalized });
        }
      });

      if (invalidRows.length > 0) {
        const preview = invalidRows.slice(0, 5).map(r => `Row ${r.row}: ${r.reason}`).join('\n');
        alert(`Found ${invalidRows.length} invalid rows (first 5):\n${preview}`);
      }

      const processed = Array.from(itemMap.values()).map(item => {
        const existing = supplies.find(s => normalizeItemName(s.itemName) === item.normalizedName);
        return {
          ...item,
          isExisting: !!existing,
          existingSupply: existing,
          existingQuantity: existing?.quantity || 0,
          existingEntryPrice: existing?.entryPrice || 0,
          existingCurrentPrice: existing?.currentPrice || existing?.entryPrice || 0,
          newTotalQuantity: existing ? existing.quantity + item.quantity : item.quantity,
          action: existing ? 'update' : 'create',
          needsPricing: item.currentPrice === 0,
          nameVariation: existing && existing.itemName !== item.itemName ? `Will update \"${existing.itemName}\"` : null
        };
      });

      setImportedData(processed);
      setImportPreviewOpen(true);

    } catch (err) {
      console.error('import error', err);
      alert('Failed to parse file');
    } finally {
      setIsImporting(false);
    }
  };

  const saveImportedSupplies = async () => {
    if (!API_BASE_URL) { alert('No backend configured for import.'); return; }
    try {
      setIsImporting(true);
      setImportProgress(0);
      const bulkData = importedData.map(it => ({ itemName: it.itemName, quantity: it.quantity, unit: it.unit, currentPrice: it.currentPrice || 0 }));
      const res = await axios.post(`${API_BASE_URL}/api/warehouses/${warehouse._id}/supplies/bulk-import?userId=${user.id}`, { supplies: bulkData, currency: currencyUnit }, {
        onUploadProgress: (e) => { if (e.total) setImportProgress(Math.round((e.loaded*100)/e.total)); }
      });

      if (res.data?.success) {
        fetchSupplies();
        setImportPreviewOpen(false);
        setImportedData([]);
        alert('Import completed successfully');
      } else {
        alert('Import failed on server');
      }
    } catch (err) {
      console.error('saveImportedSupplies', err);
      alert('Failed to upload import');
    } finally { setIsImporting(false); setImportProgress(0); }
  };

  const openModal = (supply = null) => {
    if (supply) {
      setFormData({ itemName: supply.itemName, quantity: String(supply.quantity), unit: supply.unit || '', entryPrice: String(supply.entryPrice || ''), currentPrice: String(supply.currentPrice || supply.entryPrice || '') });
      setEditingSupply(supply);
    } else {
      setFormData({ itemName: '', quantity: '', unit: '', entryPrice: '', currentPrice: '' });
      setEditingSupply(null);
    }
    setModalOpen(true);
  };

  const saveSupply = async () => {
    if (!formData.itemName || !formData.quantity || !formData.unit || !formData.entryPrice) { alert('Please fill required fields'); return; }
    if (!API_BASE_URL) { alert('No backend configured to save supply'); return; }
    try {
      setLoading(true);
      const payload = { itemName: formData.itemName, quantity: parseFloat(formData.quantity), unit: formData.unit, currency: currencyUnit, entryPrice: parseFloat(formData.entryPrice), userId: user.id };
      if (!editingSupply) payload.currentPrice = parseFloat(formData.entryPrice);
      let res;
      if (editingSupply) {
        res = await axios.put(`${API_BASE_URL}/api/warehouses/${warehouse._id}/supplies/${editingSupply._id}?userId=${user.id}`, payload);
      } else {
        res = await axios.post(`${API_BASE_URL}/api/warehouses/${warehouse._id}/supplies?userId=${user.id}`, payload);
      }
      if (res.data?.success) {
        fetchSupplies();
        setModalOpen(false);
        setFormData({ itemName: '', quantity: '', unit: '', entryPrice: '', currentPrice: '' });
        alert(editingSupply ? 'Supply updated' : 'Supply added');
      }
    } catch (err) { console.error('saveSupply', err); alert('Failed to save supply'); }
    finally { setLoading(false); }
  };

  const openPriceModal = (supply) => {
    setEditingSupply(supply);
    setFormData({ ...formData, currentPrice: String(supply.currentPrice || supply.entryPrice || '') });
    setPriceModalOpen(true);
  };

  const updateCurrentPrice = async () => {
    if (!formData.currentPrice) { alert('Enter price'); return; }
    if (!API_BASE_URL) { alert('No backend configured'); return; }
    try {
      setLoading(true);
      const res = await axios.put(`${API_BASE_URL}/api/warehouses/${warehouse._id}/supplies/${editingSupply._id}/price?userId=${user.id}`, { currentPrice: parseFloat(formData.currentPrice), currency: currencyUnit });
      if (res.data?.success) { fetchSupplies(); setPriceModalOpen(false); alert('Price updated'); }
    } catch (err) { console.error('updateCurrentPrice', err); alert('Failed to update'); }
    finally { setLoading(false); }
  };

  const deleteSupply = async (id) => {
    if (!confirm('Are you sure you want to delete this supply?')) return;
    if (!API_BASE_URL) { alert('No backend configured'); return; }
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/warehouses/${warehouse._id}/supplies/${id}?userId=${user.id}`);
      if (res.data?.success) { fetchSupplies(); alert('Deleted'); }
    } catch (err) { console.error('deleteSupply', err); alert('Failed to delete'); }
  };

  const getTotalValue = () => supplies.reduce((acc, s) => acc + ((s.currentPrice || s.entryPrice || 0) * (s.quantity || 0)), 0);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => {
              // 💡 USE useNavigation HOOK LIKE WarehouseDetailsScreen
              navigation.goBack();
            }}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', height: 40, width: 40, borderRadius: 8, color: '#fff', cursor: 'pointer' }}
            aria-label="Back"
          >
            <IoArrowBack size={20} />
          </button>
        </div>

        <div style={styles.titleBlock}>
          <h1 style={styles.headerTitle}>Warehouse Supplies</h1>
          <div style={styles.headerSubtitle}>Total Items: {supplies.length} • Total Value: {currencyUnit}{getTotalValue().toFixed(2)}</div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontWeight: 700, cursor: 'pointer' }} onClick={() => { const alt = prompt('Set global currency symbol', currencyUnit); if (alt) { localStorage.setItem(`warehouseCurrency_${warehouse._id}`, alt); setCurrencyUnit(alt); } }}>{currencyUnit}</div>
        </div>
      </header>

      <main style={styles.content}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={styles.searchBar}>
            <IoSearchOutline size={20} color="#9CA3AF" />
            <input value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Search supplies..." style={{ border: 'none', outline: 'none', flex: 1 }} />
            {searchQuery && <button onClick={clearSearch} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><IoCloseCircle /></button>}
          </div>

          <div>
            {canEdit && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input ref={fileInputRef} onChange={handleFileChange} type="file" accept=".csv, .xlsx, .xls" style={{ display: 'none' }}/>
                <button onClick={() => fileInputRef.current?.click()} style={styles.ghostButton}>Import CSV/Excel</button>
                <button onClick={() => openModal(null)} style={styles.primaryButton}>Add Supply</button>
              </div>
            )}
          </div>
        </div>
        <div style={styles.card}>

        <div style={styles.list}>
          {filteredSupplies.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#666' }}>
              <div style={{ fontSize: 40 }}>📦</div>
              <div style={{ marginTop: 12 }}>{searchQuery ? 'No supplies match your search' : 'No supplies added yet'}</div>
            </div>
          )}

          {filteredSupplies.map((item) => (
            <div key={item._id || item.itemName} style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{item.itemName}</div>
                  <div style={{ marginTop: 8, color: '#666' }}>Quantity: {item.quantity} {item.unit}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ background: '#FFF3E0', padding: '6px 10px', borderRadius: 8, border: '1px solid #E69138' }}>
                    <div style={{ fontSize: 12, color: '#E69138' }}>Entry</div>
                    <div style={{ fontWeight: 700 }}>{item.currency || currencyUnit}{item.entryPrice || 0}</div>
                  </div>

                  {(item.currentPrice && item.currentPrice !== item.entryPrice) && (
                    <div style={{ marginTop: 8, background: '#E3F2FD', padding: '6px 10px', borderRadius: 8, border: '1px solid #1976D2' }}>
                      <div style={{ fontSize: 12, color: '#1976D2' }}>Current</div>
                      <div style={{ fontWeight: 700, color: '#1976D2' }}>{item.currency || currencyUnit}{item.currentPrice}</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#28a745', fontWeight: 700 }}>Total: {item.currency || currencyUnit}{((item.quantity || 0) * (item.currentPrice || item.entryPrice || 0)).toFixed(2)}</div>

                {canEdit && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openModal(item)} style={{ background: '#FFF3E0', border: 'none', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}><IoPencilOutline /></button>
                    <button onClick={() => openPriceModal(item)} style={{ background: '#E3F2FD', border: 'none', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}><IoTrendingUpOutline /></button>
                    <button onClick={() => deleteSupply(item._id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}><IoTrashOutline /></button>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
        </div>

        

      </main>

      {modalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setModalOpen(false)}>
          <form style={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); saveSupply(); }}>            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingSupply ? 'Edit Supply' : 'Add New Supply'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} style={styles.closeModalBtn}>
                <IoCloseCircle size={24} />
              </button>
            </div>
            
            <div style={styles.formSection}>
              <label style={styles.formLabel}>
                Item Name <span style={{ color: '#ef4444' }}>*</span>
                <input value={formData.itemName} onChange={(e) => setFormData({ ...formData, itemName: e.target.value })} style={styles.formInput} className="form-input" placeholder="e.g., Cement Bags" />
              </label>

              <div style={styles.formRow}>
                <label style={{
                  ...styles.formLabel,
                  flex: 2,
                  marginBottom: 0 // Remove bottom margin from label within formRow
                }}>
                  Quantity <span style={{ color: '#ef4444' }}>*</span>
                  <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} style={styles.formInput} className="form-input" placeholder="e.g., 100" />
                </label>
                <label style={{ ...styles.formLabel, flex: 1 }}>
                  Unit <span style={{ color: '#ef4444' }}>*</span>
                  <input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} style={styles.formInput} className="form-input" placeholder="e.g., bags" />
                </label>
              </div>

              <label style={styles.formLabel}>
                Entry Price ({currencyUnit}) <span style={{ color: '#ef4444' }}>*</span>
                <input 
                  type="number" 
                  value={formData.entryPrice} 
                  onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })} 
                  style={styles.formInput}
                  className="form-input" 
                  placeholder="Price per unit"
                  disabled={!!editingSupply}
                />
                {editingSupply && <small style={styles.smallText}>Entry price cannot be changed. Use "Update Price" from the list to set the current market price.</small>}
              </label>
            </div>

            <div style={styles.formActions}>
              <button type="button" onClick={() => setModalOpen(false)} style={styles.formButtonSecondary} className="form-button-secondary">Cancel</button>
              <button type="submit" style={styles.formButtonPrimary} className="form-button-primary" disabled={loading}>
                {loading ? 'Saving...' : (editingSupply ? 'Update Supply' : 'Add Supply')}
              </button>
            </div>
          </form>
        </div>
      )}

      {priceModalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setPriceModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Update Current Price</h3>
            {editingSupply && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700 }}>{editingSupply.itemName}</div>
                <div style={{ color: '#666' }}>Entry: {editingSupply.currency || currencyUnit}{editingSupply.entryPrice}</div>
              </div>
            )}

            <div>
              <label>Current Market Price ({currencyUnit})</label>
              <input type="number" value={formData.currentPrice} onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })} style={styles.formInput} className="form-input" />
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setPriceModalOpen(false)} style={{ padding: '10px 14px' }}>Cancel</button>
              <button onClick={updateCurrentPrice} style={{ padding: '10px 14px', background: '#1976D2', color: '#fff' }}>Update Price</button>
            </div>
          </div>
        </div>
      )}

      {importPreviewOpen && (
        <div style={styles.modalBackdrop} onClick={() => setImportPreviewOpen(false)}>
          <div style={{ ...styles.modal, width: 800 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Import Preview</h3>
            <div style={{ marginBottom: 12 }}>Will create: {importedData.filter(i => i.action === 'create').length} | Update: {importedData.filter(i => i.action === 'update').length}</div>

            <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
              {importedData.map((it, idx) => (
                <div key={idx} style={{ padding: 12, borderRadius: 8, marginBottom: 8, background: it.isExisting ? '#fff8e1' : '#f8f9fa', border: '1px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700 }}>{it.itemName}</div>
                    <div style={{ fontWeight: 700 }}>{it.isExisting ? 'UPDATE' : 'NEW'}</div>
                  </div>
                  <div style={{ color: '#666', marginTop: 6 }}>Quantity: {it.quantity} {it.unit} {it.isExisting && `(Existing ${it.existingQuantity} → ${it.newTotalQuantity})`}</div>
                  <div style={{ color: '#666', marginTop: 6 }}>Price: {currencyUnit}{it.currentPrice || 'Not set'} {it.needsPricing && <span style={{ color: '#ff6b6b' }}>(Needs pricing)</span>}</div>
                  {it.mergedFromFile && <div style={{ color: '#2196F3', marginTop: 6 }}>Merged duplicates from file</div>}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setImportPreviewOpen(false)} style={{ padding: '10px 14px' }}>Cancel</button>
              <button onClick={saveImportedSupplies} style={{ padding: '10px 14px', background: '#E69138', color: '#fff' }}>{isImporting ? `Importing... ${importProgress}%` : 'Import All'}</button>
            </div>

          </div>
        </div>
      )}

      <style>{styleSheet}</style>
    </div>
  );
}
const styles = {
  page: { minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { background: 'linear-gradient(0deg,#E69138,#cf7f2b)', padding: '20px 24px', color: '#fff' },
  headerTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' },
  headerSubtitle: { margin: '4px 0 0', color: 'rgba(255,255,255,0.9)' },
  content: { maxWidth: 1200, margin: '-40px auto 80px', padding: 24, width: '100%' },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 10px 30px rgba(2,6,23,0.06)' },
  searchBar: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '10px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 24 },
  list: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 },
  supplyCard: { background: '#fff', padding: 16, borderRadius: 10, position: 'relative', boxShadow: '0 6px 18px rgba(0,0,0,0.06)' },
  addButton: { position: 'fixed', right: 40, bottom: 40, background: '#E69138', color: '#fff', width: 56, height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, cursor: 'pointer', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modal: { width: 500, maxHeight: '80vh', overflow: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif' },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px', // Consistent padding
    borderBottom: '1px solid #f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: '#111',
  },
  closeModalBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
  },
  formSection: { // For the main form content
    display: 'flex',
    flexDirection: 'column',
    gap: 16, // Consistent vertical spacing between groups
    padding: '20px',
  },
  formRow: { // For quantity and unit
    display: 'flex',
    gap: 12,
  },
  formLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontWeight: 600,
    color: '#333',
    fontSize: 14,
    width: '100%', // Ensure label takes full width
  },
  formInput: {
    padding: '12px 14px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 15,
    outline: 'none',
    marginTop: 4,
    background: '#f9f9f9',
    transition: 'border-color 0.2s, box-shadow 0.2s', // Corrected transition property
    width: '100%', // Ensure input takes full width of its container
  },
  formActions: {
    marginTop: 24, // More space above buttons
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '0 20px 20px', // Padding for the footer
  },
  formButtonPrimary: {
    padding: '12px 18px', background: '#E69138', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15, transition: 'background-color 0.2s',
  },
  formButtonSecondary: {
    padding: '12px 18px', background: '#f1f5f9', color: '#333', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15, transition: 'background-color 0.2s',
  },
  smallText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    display: 'block', // Ensure it's on its own line
  },
};

const dynamicStyles = `
  .form-input:focus { border-color: #E69138; box-shadow: 0 0 0 3px rgba(230, 145, 56, 0.2); }
  .form-input:disabled { background-color: #f1f5f9; color: #9ca3af; cursor: not-allowed; }
  .form-button-primary:hover { background-color: #D48806; }
  .form-button-secondary:hover { background-color: #e2e8f0; }
  .form-button-primary:disabled { background-color: #f4c078; cursor: not-allowed; }
`;