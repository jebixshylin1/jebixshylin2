import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./FireRestriction.css";
import {
  OPTIONS,
  lookupEmployeeById,
  fetchRestrictionRecords,
  createRestrictionRecord,
  updateRestrictionRecord,
  deleteRestrictionRecord,
  deleteRestrictionRecords,
  deleteCategoryFromRecord,
} from "../../services/mockDataService";

const PAGE_SIZE_OPTIONS = [5, 10, 25];

/* ========================================================================
 * Modal shell (dimmed overlay + centered panel). Used by every dialog
 * on this screen.
 * ===================================================================== */

const MODAL_SIZE_CLASS = {
  sm: "modal-panel--sm",
  md: "modal-panel--md",
  lg: "modal-panel--lg",
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
 * Confirm dialog (delete confirmations)
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
 * Expanded "Category Details" sub-table for a single employee record
 * ===================================================================== */

function CategoryPanel({ record, onDeleteCategory }) {
  const count = record.categories.length;

  return (
    <div className="category-panel">
      <div className="category-panel-header">
        <div className="category-panel-title">Category Details</div>
        <div className="category-panel-subtitle">
          {count} {count === 1 ? "category" : "categories"} configured
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Asset Class Category</th>
            <th>Contract Type Category</th>
            <th>PI Indicator Category</th>
            <th>Customer Type</th>
            <th className="col-action">Action</th>
          </tr>
        </thead>
        <tbody>
          {record.categories.map((cat) => (
            <tr key={cat.id}>
              <td>
                {cat.assetClass.map((v) => (
                  <span key={v} className="msd-tag tag-asset category-tag">
                    {v}
                  </span>
                ))}
              </td>
              <td>
                {cat.contractType.map((v) => (
                  <span key={v} className="msd-tag tag-contract category-tag">
                    {v}
                  </span>
                ))}
              </td>
              <td>
                {cat.piIndicator.map((v) => (
                  <span key={v} className="msd-tag tag-pi category-tag">
                    {v}
                  </span>
                ))}
              </td>
              <td>
                {cat.customerType.map((v) => (
                  <span key={v} className="msd-tag tag-customer category-tag">
                    {v}
                  </span>
                ))}
              </td>
              <td>
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  aria-label="Delete category"
                  onClick={() => onDeleteCategory(record.id, cat.id)}
                >
                  &#128465;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ========================================================================
 * Add / Edit Record modal
 * ===================================================================== */

const EMPTY_FORM = {
  employeeId: "",
  employeeName: "",
  branchCode: "",
  branchName: "",
  assetClass: [],
  contractType: [],
  piIndicator: [],
  customerType: [],
  reason: "",
};

function RecordModal({ mode, isOpen, record, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && record) {
      const firstCategory = record.categories[0] || {};
      setForm({
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        branchCode: record.branchCode,
        branchName: record.branchName,
        assetClass: firstCategory.assetClass || [],
        contractType: firstCategory.contractType || [],
        piIndicator: firstCategory.piIndicator || [],
        customerType: firstCategory.customerType || [],
        reason: record.reason || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setSearchError("");
  }, [isOpen, mode, record]);

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleEmployeeLookup = async () => {
    if (!form.employeeId.trim()) {
      setSearchError("Enter an Employee ID to search.");
      return;
    }
    setSearching(true);
    setSearchError("");
    const match = await lookupEmployeeById(form.employeeId);
    setSearching(false);
    if (!match) {
      setSearchError("No employee found with that ID.");
      return;
    }
    setForm((f) => ({
      ...f,
      employeeName: match.employeeName,
      branchCode: match.branchCode,
      branchName: match.branchName,
    }));
  };

  const isValid =
    form.employeeId.trim() &&
    form.employeeName.trim() &&
    form.assetClass.length > 0 &&
    form.contractType.length > 0 &&
    form.piIndicator.length > 0 &&
    form.customerType.length > 0 &&
    (mode === "edit" || form.reason.trim());

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
  };

  const isAdd = mode === "add";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={isAdd ? "+" : "\u270E"}
      title={isAdd ? "Add New Record" : "Edit Record"}
      description={
        isAdd
          ? "Add a new claim record by entering the employee details."
          : "Update the category details for this employee."
      }
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? "Saving..." : isAdd ? "Submit" : "Update"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-field">
          <label>Employee ID</label>
          {isAdd ? (
            <div className="form-field-with-action">
              <input
                type="text"
                placeholder="Employee ID"
                value={form.employeeId}
                onChange={(e) => updateField("employeeId", e.target.value)}
              />
              <button
                type="button"
                className="field-action-btn field-action-btn--inline"
                onClick={handleEmployeeLookup}
                aria-label="Search employee"
                disabled={searching}
              >
                {searching ? "\u2026" : "\u{1F50D}"}
              </button>
            </div>
          ) : (
            <input type="text" value={form.employeeId} readOnly />
          )}
        </div>

        <div className="form-field">
          <label>Employee Name</label>
          <input
            type="text"
            placeholder="Employee Name"
            value={form.employeeName}
            onChange={(e) => updateField("employeeName", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Branch Code</label>
          <input
            type="text"
            placeholder="Branch Code"
            value={form.branchCode}
            onChange={(e) => updateField("branchCode", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Branch Name</label>
          <input
            type="text"
            placeholder="Branch Name"
            value={form.branchName}
            onChange={(e) => updateField("branchName", e.target.value)}
          />
        </div>
      </div>

      {searchError && <p className="field-error-text">{searchError}</p>}

      {!isAdd && (
        <>
          <hr className="form-section-divider" />
          <p className="section-label">Category Details</p>
        </>
      )}

      <div className={`form-grid ${isAdd ? "form-grid--spaced" : ""}`}>
        <MultiSelectDropdown
          label="Asset Class Category"
          required
          options={OPTIONS.assetClass}
          value={form.assetClass}
          onChange={(v) => updateField("assetClass", v)}
          tagColorClass="tag-asset"
        />
        <MultiSelectDropdown
          label="Contract Type Category"
          required
          options={OPTIONS.contractType}
          value={form.contractType}
          onChange={(v) => updateField("contractType", v)}
          tagColorClass="tag-contract"
        />
        <MultiSelectDropdown
          label="PI Indicator Category"
          required
          options={OPTIONS.piIndicator}
          value={form.piIndicator}
          onChange={(v) => updateField("piIndicator", v)}
          tagColorClass="tag-pi"
        />
        <MultiSelectDropdown
          label="Customer Type"
          required
          options={OPTIONS.customerType}
          value={form.customerType}
          onChange={(v) => updateField("customerType", v)}
          tagColorClass="tag-customer"
        />
      </div>

      {isAdd && (
        <div className="form-field form-field--spaced">
          <label>
            Reason <span className="required">*</span>
          </label>
          <textarea
            rows={4}
            placeholder="Enter reason"
            value={form.reason}
            onChange={(e) => updateField("reason", e.target.value)}
          />
        </div>
      )}
    </Modal>
  );
}

/* ========================================================================
 * FireRestriction - main screen (FI Restriction Records)
 * ===================================================================== */

export default function FireRestriction() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [activeRecord, setActiveRecord] = useState(null);

  const [confirmTarget, setConfirmTarget] = useState(null);
  // { type: "record" | "bulk" | "category", id, categoryId? }

  const loadRecords = useCallback(async (employeeId) => {
    setIsLoading(true);
    const data = await fetchRestrictionRecords({ employeeId });
    setRecords(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      loadRecords(searchTerm);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchTerm, loadRecords]);

  const totalResults = records.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const pagedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, page, pageSize]);

  const allOnPageSelected = pagedRecords.length > 0 && pagedRecords.every((r) => selectedIds.includes(r.id));

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedIds((ids) => ids.filter((id) => !pagedRecords.some((r) => r.id === id)));
    } else {
      setSelectedIds((ids) => [...ids, ...pagedRecords.filter((r) => !ids.includes(r.id)).map((r) => r.id)]);
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const toggleExpand = (id) => setExpandedId((cur) => (cur === id ? null : id));

  const openAddModal = () => {
    setActiveRecord(null);
    setModalMode("add");
  };

  const openEditModal = (record) => {
    setActiveRecord(record);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveRecord(null);
  };

  const handleModalSubmit = async (formValues) => {
    if (modalMode === "add") {
      await createRestrictionRecord(formValues);
    } else if (modalMode === "edit" && activeRecord) {
      await updateRestrictionRecord(activeRecord.id, formValues);
    }
    closeModal();
    await loadRecords(searchTerm);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    if (confirmTarget.type === "record") {
      await deleteRestrictionRecord(confirmTarget.id);
      setSelectedIds((ids) => ids.filter((x) => x !== confirmTarget.id));
    } else if (confirmTarget.type === "bulk") {
      await deleteRestrictionRecords(selectedIds);
      setSelectedIds([]);
    } else if (confirmTarget.type === "category") {
      await deleteCategoryFromRecord(confirmTarget.id, confirmTarget.categoryId);
    }
    setConfirmTarget(null);
    await loadRecords(searchTerm);
  };

  const confirmMessage = () => {
    if (!confirmTarget) return "";
    if (confirmTarget.type === "record") {
      return "This will permanently remove the employee's restriction record. This action cannot be undone.";
    }
    if (confirmTarget.type === "bulk") {
      return `This will permanently remove ${selectedIds.length} selected record(s). This action cannot be undone.`;
    }
    return "This will remove this category combination from the employee's record.";
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-header-title">FI Restriction Records</h2>
          <p className="card-header-subtitle">Manage employee restriction records and category details.</p>
        </div>

        <div className="card-header-actions">
          <div className="search-input">
            <span className="search-icon">&#128269;</span>
            <input
              type="text"
              placeholder="Search by Employee ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {selectedIds.length > 0 && (
            <button type="button" className="btn btn-danger" onClick={() => setConfirmTarget({ type: "bulk" })}>
              &#128465; Delete ({selectedIds.length})
            </button>
          )}

          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            + Add
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-narrow" />
              <th className="col-narrow">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                  aria-label="Select all rows on this page"
                />
              </th>
              <th>S.No</th>
              <th>Employee ID &#8645;</th>
              <th>Employee Name &#8645;</th>
              <th>Branch Code &#8645;</th>
              <th>Branch Name &#8645;</th>
              <th>Date &#8645;</th>
              <th>Reason</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="loading-state-cell">
                  Loading records&hellip;
                </td>
              </tr>
            ) : pagedRecords.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-state-cell">
                  No restriction records found.
                </td>
              </tr>
            ) : (
              pagedRecords.map((record, index) => (
                <React.Fragment key={record.id}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        className={`row-expand-btn ${expandedId === record.id ? "expanded" : ""}`}
                        onClick={() => toggleExpand(record.id)}
                        aria-label="Toggle category details"
                      >
                        {expandedId === record.id ? "\u25BC" : "\u203A"}
                      </button>
                    </td>
                    <td>
                      <input type="checkbox" checked={selectedIds.includes(record.id)} onChange={() => toggleSelectRow(record.id)} />
                    </td>
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td className="cell-link">{record.employeeId}</td>
                    <td>{record.employeeName}</td>
                    <td>{record.branchCode}</td>
                    <td>{record.branchName}</td>
                    <td>{record.date}</td>
                    <td className="cell-muted">{record.reason || "\u2013"}</td>
                    <td>
                      <div className="action-cell">
                        <button type="button" className="icon-btn" aria-label="Edit record" onClick={() => openEditModal(record)}>
                          &#9998;
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          aria-label="Delete record"
                          onClick={() => setConfirmTarget({ type: "record", id: record.id })}
                        >
                          &#128465;
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === record.id && (
                    <tr>
                      <td colSpan={10} className="category-row-cell">
                        <CategoryPanel
                          record={record}
                          onDeleteCategory={(recordId, categoryId) => setConfirmTarget({ type: "category", id: recordId, categoryId })}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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

      <RecordModal
        mode={modalMode === "edit" ? "edit" : "add"}
        isOpen={modalMode !== null}
        record={activeRecord}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />

      <ConfirmDialog
        isOpen={confirmTarget !== null}
        title={confirmTarget?.type === "bulk" ? "Delete selected records?" : "Delete record?"}
        message={confirmMessage()}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
