import { Check, X, Minus, Info } from 'lucide-react';

const Checklist = ({ title, items, values, onChange }) => {
  let itemCounter = 0;

  return (
    <div className="checklist-container">
      <div className="checklist-items flex flex-col gap-2">
        {items.map((item, index) => {
          const isSubsection = typeof item === 'string' && item.trim().endsWith(':');
          const itemName = typeof item === 'string' ? item : item.name;
          const status = values[index] || null;

          if (isSubsection) {
            // Lógica de "UNICA OPCION": Si es una subsección y lo que sigue es otra subsección o es el final,
            // creamos un ítem virtual para que el usuario pueda verificar.
            const nextItem = items[index + 1];
            const isEmptySubsection = !nextItem || (typeof nextItem === 'string' && nextItem.trim().endsWith(':'));

            const sectionIndices = [];
            let i = index + 1;
            while (i < items.length) {
              if (typeof items[i] === 'string' && items[i].trim().endsWith(':')) break;
              sectionIndices.push(i);
              i++;
            }

            const allOk = sectionIndices.length > 0 && sectionIndices.every(idx => values[idx] === 'ok');
            const allFail = sectionIndices.length > 0 && sectionIndices.every(idx => values[idx] === 'fail');
            const allNa = sectionIndices.length > 0 && sectionIndices.every(idx => values[idx] === 'na');

            const handleSectionSelectAll = (sectionStatus) => {
              sectionIndices.forEach(idx => onChange(idx, sectionStatus));
            };

            return (
              <div key={index} className="subsection-wrapper-refined">
                <div className="checklist-subsection-header animate-fade-in shadow-soft" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="subsection-accent" />
                    <span>{itemName}</span>
                  </div>

                  {!isEmptySubsection && (
                    <div className="status-button-group-v2 !bg-white header-group-scale" style={{ padding: '2px', transform: 'scale(0.85)', transformOrigin: 'right center', margin: '-4px 0' }}>
                      <button
                        className={`status-btn-compact ok ${allOk ? 'active' : 'opacity-70 hover:opacity-100'}`}
                        onClick={() => handleSectionSelectAll('ok')}
                        title="Marcar todos OK"
                      >
                        <Check size={16} strokeWidth={3} />
                      </button>
                      <button
                        className={`status-btn-compact fail ${allFail ? 'active' : 'opacity-70 hover:opacity-100'}`}
                        onClick={() => handleSectionSelectAll('fail')}
                        title="Marcar todos FALLA"
                      >
                        <X size={16} strokeWidth={3} />
                      </button>
                      <button
                        className={`status-btn-compact na ${allNa ? 'active' : 'opacity-70 hover:opacity-100'}`}
                        onClick={() => handleSectionSelectAll('na')}
                        title="Marcar todos N/A"
                      >
                        <Minus size={16} strokeWidth={3} />
                      </button>
                    </div>
                  )}
                </div>
                {isEmptySubsection && (
                  <div className="checklist-item-row animate-fade-in !bg-[#fafafa] border-dashed">
                    <div className="row-content-inner">
                      <div className="row-number-pill">!</div>
                      <span className="row-text-main !text-indigo-600">Único</span>
                    </div>

                    <div className="status-button-group-v2 !bg-white">
                      <button
                        className={`status-btn-compact ok ${status === 'ok' ? 'active' : ''}`}
                        onClick={() => onChange(index, 'ok')}
                        title="OK"
                      >
                        <Check size={18} strokeWidth={3} />
                      </button>
                      <button
                        className={`status-btn-compact fail ${status === 'fail' ? 'active' : ''}`}
                        onClick={() => onChange(index, 'fail')}
                        title="FALLA"
                      >
                        <X size={18} strokeWidth={3} />
                      </button>
                      <button
                        className={`status-btn-compact na ${status === 'na' ? 'active' : ''}`}
                        onClick={() => onChange(index, 'na')}
                        title="N/A"
                      >
                        <Minus size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          itemCounter++;

          return (
            <div key={index} className="checklist-item-row animate-fade-in">
              <div className="row-content-inner">
                <div className="row-number-pill">{itemCounter}</div>
                <span className="row-text-main">{itemName}</span>
              </div>

              <div className="status-button-group-v2">
                <button
                  className={`status-btn-compact ok ${status === 'ok' ? 'active' : ''}`}
                  onClick={() => onChange(index, 'ok')}
                  title="OK"
                >
                  <Check size={18} strokeWidth={3} />
                </button>
                <button
                  className={`status-btn-compact fail ${status === 'fail' ? 'active' : ''}`}
                  onClick={() => onChange(index, 'fail')}
                  title="FALLA"
                >
                  <X size={18} strokeWidth={3} />
                </button>
                <button
                  className={`status-btn-compact na ${status === 'na' ? 'active' : ''}`}
                  onClick={() => onChange(index, 'na')}
                  title="N/A"
                >
                  <Minus size={18} strokeWidth={3} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .checklist-container { width: 100%; }
        .checklist-subsection-header { 
          padding: 12px 20px; 
          margin: 32px 0 12px 0;
          background: #f8fafc;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-left: 4px solid #5558fa;
        }
        
        .checklist-subsection-header:first-child { margin-top: 0; }
        
        .checklist-subsection-header span {
          font-size: 0.8rem; 
          font-weight: 950; 
          color: #1e293b; 
          text-transform: uppercase; 
          letter-spacing: 1.2px;
        }

        .checklist-item-row { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 10px 16px; border-bottom: 1.5px solid #f9f9f9; transition: all 0.2s; }
        .checklist-item-row:hover { background: #fafafa; }

        .row-content-inner { display: flex; align-items: center; gap: 16px; flex: 1; margin-right: 20px; }
        .row-number-pill { font-size: 10px; font-weight: 900; color: #cbd5e1; width: 24px; text-align: center; }
        .row-text-main { font-size: 0.95rem; font-weight: 700; color: #334155; line-height: 1.4; }

        .status-button-group-v2 { display: flex; gap: 6px; background: #f8fafc; padding: 4px; border-radius: 14px; border: 1.5px solid #f1f5f9; }
        .status-btn-compact { 
            width: 38px; height: 38px; border-radius: 10px; border: none; background: transparent; 
            color: #cbd5e1; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
        }
        
        .status-btn-compact:hover { background: #fff; color: #1e293b; }
        
        .status-btn-compact.ok.active { background: #10b981; color: #fff; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
        .status-btn-compact.fail.active { background: #ef4444; color: #fff; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
        .status-btn-compact.na.active { background: #64748b; color: #fff; box-shadow: 0 4px 12px rgba(100, 116, 139, 0.2); }

        @media (max-width: 1024px) {
          .checklist-item-row { flex-direction: column; align-items: stretch; gap: 12px; padding: 14px; }
          .row-content-inner { margin-right: 0; }
          .row-text-main { font-size: 0.875rem; }
          .checklist-item-row .status-button-group-v2 { display: grid; grid-template-columns: 1fr 1fr 1fr; width: 100%; gap: 4px; }
          .checklist-item-row .status-btn-compact { width: 100%; height: 44px; }
          .header-group-scale { display: flex !important; width: auto !important; }
          .header-group-scale .status-btn-compact { width: 30px !important; height: 30px !important; }
          .checklist-subsection-header { margin: 24px 0 8px 0; padding: 10px 16px; }
          .checklist-subsection-header span { font-size: 0.75rem; }
        }
      `}</style>
    </div>
  );
};

export default Checklist;
