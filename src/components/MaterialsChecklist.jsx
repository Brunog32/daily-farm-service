import { Package } from 'lucide-react';

const MaterialsChecklist = ({ items, values, onChange, tamboSpecs }) => {
  return (
    <div className="materials-container">
      <div className="materials-list flex flex-col gap-4">
        {items.map((item, index) => {
          const isStatic = typeof item === 'string';
          const itemName = isStatic ? item : item.name;
          const specKey = isStatic ? null : (item.specKey || null);
          const specValue = specKey && tamboSpecs ? tamboSpecs[specKey] : null;
          const hasSpecValue = !!(specValue && String(specValue).trim());
          const isDynamic = !!specKey;

          const currentValue = values[index] || 0;
          const currentText = values[`${index}_text`] || '';

          let displayName;
          let showTextInput = false;

          if (isDynamic) {
            if (hasSpecValue) {
              displayName = String(specValue).trim();
            } else {
              displayName = null;
              showTextInput = true;
            }
          } else {
            displayName = itemName;
          }

          return (
            <div key={index} className="material-row-refined animate-fade-in shadow-soft">
              <div className="material-info-part">
                <div className="icon-badge-centered" style={{ background: isDynamic ? '#fefce8' : '#f8f9fa' }}>
                  <Package size={20} className={isDynamic ? 'text-amber-400' : 'text-slate-300'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 className="material-name-heading">{itemName}</h4>
                  {isDynamic && (
                    showTextInput ? (
                      <input
                        type="text"
                        className="dynamic-text-input"
                        placeholder="No seteado en planilla, escriba el valor"
                        value={currentText}
                        onChange={(e) => onChange(`${index}_text`, e.target.value)}
                      />
                    ) : (
                      <span className="material-spec-badge">{displayName}</span>
                    )
                  )}
                </div>
              </div>

              <div className="qty-control-refined">
                <div className="qty-display-box">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="qty-input"
                    value={currentValue === 0 ? '' : currentValue}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      onChange(index, isNaN(val) ? 0 : Math.max(0, val));
                    }}
                  />
                  <span className="qty-unit">UNS</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .material-row-refined { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 10px 20px; border: 1.5px solid #f6f6f6; border-radius: 16px; transition: all 0.2s; }
        .material-row-refined:hover { border-color: #5558fa33; transform: translateX(4px); }

        .material-info-part { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; margin-right: 16px; }
        .material-name-heading { font-size: 1.05rem; font-weight: 800; color: #111; margin: 0 0 4px 0 !important; line-height: 1.3; }
        .material-spec-badge { display: inline-block; background: #fefce8; border: 1.5px solid #fde68a; color: #92400e; border-radius: 8px; padding: 2px 8px; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }

        .dynamic-text-input {
          width: 100%;
          font-size: 0.9rem;
          font-weight: 700;
          color: #92400e;
          background: #fefce8;
          border: 1.5px solid #fde68a;
          border-radius: 8px;
          padding: 6px 10px;
          outline: none;
          transition: all 0.2s;
        }
        .dynamic-text-input::placeholder { color: #d97706; font-weight: 500; font-style: italic; }
        .dynamic-text-input:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }

        .qty-control-refined { display: flex; align-items: center; gap: 12px; background: #f5f5f5; padding: 6px; border-radius: 16px; border: 2px solid #eeeeee; flex-shrink: 0; }

        .qty-display-box { min-width: 60px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; }

        .qty-input {
          width: 50px;
          text-align: center;
          font-size: 1.15rem;
          font-weight: 900;
          color: #111;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 2px;
          outline: none;
          transition: all 0.2s;
        }
        .qty-input:focus { border-color: #5558fa; box-shadow: 0 0 0 3px rgba(85, 88, 250, 0.1); }

        .qty-input::-webkit-outer-spin-button,
        .qty-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .qty-input[type=number] { -moz-appearance: textfield; }

        .qty-unit { font-size: 8px; font-weight: 900; color: #ccc; margin-top: 2px; }

        @media (max-width: 1024px) {
          .material-row-refined { flex-direction: column; align-items: stretch; gap: 16px; padding: 16px; }
          .material-info-part { gap: 12px; margin-right: 0; }
          .material-name-heading { font-size: 0.95rem; }
          .qty-control-refined { width: 100%; justify-content: space-between; padding: 10px 16px; }
          .qty-display-box { flex-direction: row; min-width: 0; width: 100%; justify-content: space-between; }
          .qty-input { width: 80px; font-size: 1rem; }
          .qty-unit { margin-top: 0; font-size: 10px; }
        }
      `}</style>
    </div>
  );
};

export default MaterialsChecklist;
