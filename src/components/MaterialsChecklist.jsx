import { Package } from 'lucide-react';

const MaterialsChecklist = ({ items, values, onChange }) => {
  return (
    <div className="materials-container">
      <div className="materials-list flex flex-col gap-4">
        {items.map((item, index) => {
          const isSubsection = typeof item === 'string'; // En materiales, cualquier string es una sección
          const itemName = isSubsection ? (item.trim().endsWith(':') ? item : `${item.trim()}:`) : item.name;
          const category = item.category || null;

          if (isSubsection) {
            // Si es un string, lo tratamos como cabecera de sección.
            // Si no tiene ítems reales debajo (es el último o el siguiente también es un string),
            // inyectamos la fila virtual de UNICA OPCIÓN.
            const nextItem = items[index + 1];
            const isTrulyEmpty = !nextItem || typeof nextItem === 'string';
            const currentValue = values[index] || 0;

            return (
              <div key={index} className="subsection-wrapper-refined">
                <div className="checklist-subsection-header animate-fade-in !mt-8 !mb-4">
                  {itemName}
                </div>
                {isTrulyEmpty && (
                  <div className="material-row-refined animate-fade-in shadow-soft !bg-[#fafafa] border-dashed">
                    <div className="material-info-part">
                      <div className="icon-badge-centered" style={{ background: '#fff' }}>
                        <Package size={20} className="text-indigo-300" />
                      </div>
                      <div>
                        <span className="material-category-tag">REQUERIDO</span>
                        <h4 className="material-name-heading !text-indigo-600">UNICA OPCIÓN</h4>
                      </div>
                    </div>

                    <div className="qty-control-refined !bg-white">
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
                )}
              </div>
            );
          }

          const currentValue = values[index] || 0;

          return (
            <div key={index} className="material-row-refined animate-fade-in shadow-soft">
              <div className="material-info-part">
                <div className="icon-badge-centered" style={{ background: '#f8f9fa' }}>
                  <Package size={20} className="text-slate-300" />
                </div>
                <div>
                  {category && <span className="material-category-tag">{category}</span>}
                  <h4 className="material-name-heading">{itemName}</h4>
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
        
        .checklist-subsection-header { 
          padding: 12px 20px; 
          margin-top: 28px;
          margin-bottom: 12px;
          font-size: 0.8rem; 
          font-weight: 900; 
          color: #111; 
          text-transform: uppercase; 
          letter-spacing: 1.5px;
          background: #f8f9fa;
          border-left: 4px solid #5558fa;
          border-radius: 12px;
          width: 100%;
          display: flex;
          align-items: center;
        }

        .material-info-part { display: flex; align-items: center; gap: 16px; }
        .material-category-tag { font-size: 8px; font-weight: 900; color: #bbb; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 2px; }
        .material-name-heading { font-size: 1.05rem; font-weight: 800; color: #111; margin: 0 !important; tracking-tight: -0.01em; line-height: 1.3; }

        .qty-control-refined { display: flex; align-items: center; gap: 12px; background: #f5f5f5; padding: 6px; border-radius: 16px; border: 2px solid #eeeeee; }
        
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
        
        /* Ocultar flechas del input number */
        .qty-input::-webkit-outer-spin-button,
        .qty-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .qty-input[type=number] { -moz-appearance: textfield; }

        .qty-unit { font-size: 8px; font-weight: 900; color: #ccc; margin-top: 2px; }

        @media (max-width: 1024px) {
          .material-row-refined { flex-direction: column; align-items: stretch; gap: 16px; padding: 16px; }
          .material-info-part { gap: 12px; }
          .material-name-heading { font-size: 0.95rem; }
          .qty-control-refined { width: 100%; justify-content: space-between; padding: 10px 16px; }
          .qty-display-box { flex-direction: row; min-width: 0; width: 100%; justify-content: space-between; }
          .qty-input { width: 80px; font-size: 1rem; }
          .qty-unit { margin-top: 0; font-size: 10px; }
          .checklist-subsection-header { margin-top: 20px; font-size: 0.75rem; padding: 10px 16px; }
        }
      `}</style>
    </div>
  );
};

export default MaterialsChecklist;
