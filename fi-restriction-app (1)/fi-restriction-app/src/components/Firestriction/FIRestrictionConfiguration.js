import React, { useEffect, useRef, useState } from "react";
import "./FIRestrictionConfiguration.css";
import {
  OPTIONS,
  fetchRestrictionRules,
  createRestrictionRule,
  updateRestrictionRule,
  deleteRestrictionRule,
  getEwiThresholdLabel,
} from "../../services/mockDataService";

const PAGE_SIZE_OPTIONS = [5, 10, 25];

/* ========================================================================
 * Modal shell (dimmed overlay + centered panel)
 * ===================================================================== */

const MODAL_SIZE_CLASS = {
  sm: "modal-panel--sm",
  md: "modal-panel--md",
  xl: "modal-panel--xl",
};

function Modal({ isOpen, onClose, icon, title, description, children, footer, size = "md" }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={`modal-panel ${MODAL_SIZE_CLASS[size] || MODAL_SIZE_CLASS.md}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-text">
            {icon && <span className="modal-icon">{icon}</span>}
            <div>
              <h2 className="modal-title">{title}</h2>
              {description && <p className="modal-description">{description}</p>}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            &times;
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ========================================================================
 * Confirm dialog (delete confirmation)
 * ===================================================================== */

function ConfirmDialog({ isOpen, title = "Delete record?", message, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm-dialog-message">{message}</p>
    </Modal>
  );
}

/* ========================================================================
 * Multi-select combobox rendered as removable tag chips, with an
 * optional "Select All" option.
 * ===================================================================== */

function MultiSelectDropdown({
  label,
  required,
  placeholder = "Select",
  options,
  value,
  onChange,
  showSelectAll = false,
  tagColorClass = "tag-default",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const allSelected = options.length > 0 && value.length === options.length;

  const toggleOption = (option) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const toggleSelectAll = () => {
    onChange(allSelected ? [] : [...options]);
  };

  const removeTag = (option, e) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== option));
  };

  return (
    <div className="msd-field" ref={containerRef}>
      {label && (
        <label className="msd-label">
          {label} {required && <span className="msd-required">*</span>}
        </label>
      )}

      <button
        type="button"
        className={`msd-control ${disabled ? "msd-control-disabled" : ""}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <div className="msd-value-area">
          {value.length === 0 ? (
            <span className="msd-placeholder">{placeholder}</span>
          ) : showSelectAll && allSelected ? (
            <span className="msd-placeholder-selected">Select All</span>
          ) : (
            value.map((option) => (
              <span key={option} className={`msd-tag ${tagColorClass}`}>
                {option}
                <span className="msd-tag-remove" onClick={(e) => removeTag(option, e)} role="button" aria-label={`Remove ${option}`}>
                  &times;
                </span>
              </span>
            ))
          )}
        </div>
        <span className="msd-chevron">&#9662;</span>
      </button>

      {open && !disabled && (
        <div className="msd-dropdown">
          {showSelectAll && (
            <label className="msd-option msd-option-select-all">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              Select All
            </label>
          )}
          {options.map((option) => (
            <label className="msd-option" key={option}>
              <input type="checkbox" checked={value.includes(option)} onChange={() => toggleOption(option)} />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================================================================
 * Rule Setup modal (create + edit)
 * ===================================================================== */

const EMPTY_FORM = {
  regionSelection: [],
  restrictionSelection: [],
  ewi: { restrictionAbove: 10, deRestrictionBelow: 5 },
  tenure: { fresher: 5, lateral: 15, sfaToFo: 10, nonFoToFo: 8 },
  categories: { assetClass: [], contractType: [], piIndicator: [], customerType: [] },
};

const TENURE_FIELDS = [
  { key: "fresher", label: "Fresher", sub: "Probation period (< 6 months experience)" },
  { key: "lateral", label: "Lateral", sub: "Experienced lateral industry hires" },
  { key: "sfaToFo", label: "SFA To FO", sub: "Senior Field Agent promoted to Field Officer" },
  { key: "nonFoToFo", label: "Non FO to FO", sub: "Non-field cadre lateral conversion to FO" },
];

function RuleSetupModal({ isOpen, rule, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(rule);

  useEffect(() => {
    if (!isOpen) return;
    if (rule) {
      setForm({
        regionSelection: rule.regionSelection || [],
        restrictionSelection: rule.restrictionSelection || [],
        ewi: rule.ewi || EMPTY_FORM.ewi,
        tenure: rule.tenure || EMPTY_FORM.tenure,
        categories: rule.categories || EMPTY_FORM.categories,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, rule]);

  const updateEwi = (key, value) => setForm((f) => ({ ...f, ewi: { ...f.ewi, [key]: Number(value) || 0 } }));

  const updateTenure = (key, value) => setForm((f) => ({ ...f, tenure: { ...f.tenure, [key]: Number(value) || 0 } }));

  const updateCategory = (key, value) => setForm((f) => ({ ...f, categories: { ...f.categories, [key]: value } }));

  const isValid =
    form.regionSelection.length > 0 &&
    form.restrictionSelection.length > 0 &&
    form.categories.assetClass.length > 0 &&
    form.categories.contractType.length > 0 &&
    form.categories.piIndicator.length > 0 &&
    form.categories.customerType.length > 0;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={"\u2699"}
      title="Rule Setup"
      description="Configure regions, restriction processes, thresholds, and category details."
      size="xl"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? "Saving..." : isEdit ? "Save" : "Submit"}
          </button>
        </>
      }
    >
      <div className="form-section-title">
        <span className="form-section-number">01</span>
        <span className="form-section-heading">Region &amp; Restriction Selection</span>
      </div>

      <div className="form-grid-2 form-grid-2--mb">
        <MultiSelectDropdown
          label="Region"
          options={OPTIONS.region}
          value={form.regionSelection}
          onChange={(v) => setForm((f) => ({ ...f, regionSelection: v }))}
          showSelectAll
          tagColorClass="tag-default"
        />
        <MultiSelectDropdown
          label="Restriction Selection"
          options={OPTIONS.restrictionSelection}
          value={form.restrictionSelection}
          onChange={(v) => setForm((f) => ({ ...f, restrictionSelection: v }))}
          showSelectAll
          tagColorClass="tag-default"
        />
      </div>

      <div className="form-section-title">
        <span className="form-section-number">02</span>
        <span className="form-section-heading">Threshold &amp; Tenure Allocation Parameters</span>
      </div>
      <p className="form-section-subtext section-subtext-tight">
        Configure cutoff metrics for automated throttling and field investigator allocations.
      </p>

      <div className="form-grid-2 form-grid-2--mb-stretch">
        <div className="threshold-box">
          <div className="threshold-box-header">
            <span className="threshold-box-icon warn">&#9888;</span>
            <div>
              <div className="threshold-box-title">EWI</div>
              <div className="threshold-box-subtitle">Early Warning Indicator Throttling Rules</div>
            </div>
          </div>

          <div className="threshold-row">
            <div>
              <div className="threshold-row-label-main">Restriction &gt;</div>
              <div className="threshold-row-label-sub">Restricts FI allocation when count is</div>
            </div>
            <div className="threshold-input-group">
              <input type="number" min={0} value={form.ewi.restrictionAbove} onChange={(e) => updateEwi("restrictionAbove", e.target.value)} />
              <span>Contract</span>
            </div>
          </div>

          <div className="threshold-row">
            <div>
              <div className="threshold-row-label-main">De-Restriction &lt;</div>
              <div className="threshold-row-label-sub">De-Restricts and resumes normal workflow when Count is</div>
            </div>
            <div className="threshold-input-group">
              <input
                type="number"
                min={0}
                value={form.ewi.deRestrictionBelow}
                onChange={(e) => updateEwi("deRestrictionBelow", e.target.value)}
              />
              <span>Contract</span>
            </div>
          </div>
        </div>

        <div className="threshold-box">
          <div className="threshold-box-header">
            <span className="threshold-box-icon info">&#128188;</span>
            <div>
              <div className="threshold-box-title">Tenure Based</div>
              <div className="threshold-box-subtitle">Field Officer Experience &amp; Allocation Caps</div>
            </div>
          </div>

          {TENURE_FIELDS.map((field) => (
            <div className="threshold-row" key={field.key}>
              <div>
                <div className="threshold-row-label-main">{field.label}</div>
                <div className="threshold-row-label-sub">{field.sub}</div>
              </div>
              <div className="threshold-input-group">
                <input type="number" min={0} value={form.tenure[field.key]} onChange={(e) => updateTenure(field.key, e.target.value)} />
                <span>Days</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-section-title">
        <span className="form-section-number">03</span>
        <span className="form-section-heading">Category Details</span>
      </div>
      <p className="form-section-subtext section-subtext-tight">
        Select the category combinations that apply to this restriction configuration.
      </p>

      <div className="form-grid">
        <MultiSelectDropdown
          label="Asset Class Category"
          required
          options={OPTIONS.assetClass}
          value={form.categories.assetClass}
          onChange={(v) => updateCategory("assetClass", v)}
          tagColorClass="tag-asset"
        />
        <MultiSelectDropdown
          label="Contract Type Category"
          required
          options={OPTIONS.contractType}
          value={form.categories.contractType}
          onChange={(v) => updateCategory("contractType", v)}
          tagColorClass="tag-contract"
        />
        <MultiSelectDropdown
          label="PI Indicator Category"
          required
          options={OPTIONS.piIndicator}
          value={form.categories.piIndicator}
          onChange={(v) => updateCategory("piIndicator", v)}
          tagColorClass="tag-pi"
        />
        <MultiSelectDropdown
          label="Customer Type"
          required
          options={OPTIONS.customerType}
          value={form.categories.customerType}
          onChange={(v) => updateCategory("customerType", v)}
          tagColorClass="tag-customer"
        />
      </div>
    </Modal>
  );
}

/* ========================================================================
 * FIRestrictionConfiguration - main screen (Active Restriction)
 * ===================================================================== */

export default function FIRestrictionConfiguration() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeRule, setActiveRule] = useState(null);

  const [confirmTarget, setConfirmTarget] = useState(null);

  const loadRules = async () => {
    setIsLoading(true);
    const data = await fetchRestrictionRules();
    setRules(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const filteredRules = rules.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return r.ruleId.toLowerCase().includes(term) || r.region.toLowerCase().includes(term) || r.process.toLowerCase().includes(term);
  });

  const totalResults = filteredRules.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const pagedRules = filteredRules.slice((page - 1) * pageSize, page * pageSize);

  const openCreateModal = () => {
    setActiveRule(null);
    setModalOpen(true);
  };

  const openEditModal = (rule) => {
    setActiveRule(rule);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveRule(null);
  };

  const handleModalSubmit = async (formValues) => {
    if (activeRule) {
      await updateRestrictionRule(activeRule.id, formValues);
    } else {
      await createRestrictionRule(formValues);
    }
    closeModal();
    await loadRules();
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    await deleteRestrictionRule(confirmTarget.id);
    setConfirmTarget(null);
    await loadRules();
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-header-title">Active Restriction</h2>
          <p className="card-header-subtitle">Current running restriction rules - PAN India.</p>
        </div>

        <div className="card-header-actions">
          <div className="search-input">
            <span className="search-icon">&#128269;</span>
            <input
              type="text"
              placeholder="Search rules..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            &#9881; Rule Setup
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rule ID</th>
              <th>Region</th>
              <th>Process</th>
              <th>EWI Thresholds</th>
              <th>Asset Class</th>
              <th>Contract Type</th>
              <th>PI Indicator</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="loading-state-cell">
                  Loading rules&hellip;
                </td>
              </tr>
            ) : pagedRules.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-state-cell">
                  No restriction rules have been submitted yet.
                </td>
              </tr>
            ) : (
              pagedRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="cell-strong">{rule.ruleId}</td>
                  <td>{rule.region}</td>
                  <td>
                    <span className="badge badge-process">{rule.process}</span>
                  </td>
                  <td>{getEwiThresholdLabel(rule)}</td>
                  <td>{rule.categories?.assetClass?.join(", ") || "\u2013"}</td>
                  <td>{rule.categories?.contractType?.join(", ") || "\u2013"}</td>
                  <td>{rule.categories?.piIndicator?.join(" & ") || "\u2013"}</td>
                  <td>{rule.categories?.customerType?.join(", ") || "\u2013"}</td>
                  <td>
                    <span className="badge badge-status-active">{rule.status}</span>
                  </td>
                  <td>
                    <div className="action-cell">
                      <button type="button" className="icon-btn" aria-label="Edit rule" onClick={() => openEditModal(rule)}>
                        &#9998;
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        aria-label="Delete rule"
                        onClick={() => setConfirmTarget(rule)}
                      >
                        &#128465;
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <div className="pagination-left">
          <div className="per-page-select">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>entries per page</span>
          </div>
          <span>
            Showing {totalResults === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalResults)} of{" "}
            <strong>{totalResults}</strong> results
          </span>
        </div>

        <div className="pagination-right">
          <button
            type="button"
            className="page-nav-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            &#8249;
          </button>
          <button type="button" className="page-number">
            {page}
          </button>
          <button
            type="button"
            className="page-nav-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            &#8250;
          </button>
        </div>
      </div>

      <RuleSetupModal isOpen={modalOpen} rule={activeRule} onClose={closeModal} onSubmit={handleModalSubmit} />

      <ConfirmDialog
        isOpen={confirmTarget !== null}
        title="Delete restriction rule?"
        message="This will permanently remove this restriction rule. This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
