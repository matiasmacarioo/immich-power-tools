import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { format as dateFnsFormat } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

type Language = 'en' | 'es';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  formatDate: (date: Date | number, formatStr: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  'Parent': { en: 'Parent', es: 'Padre/Madre' },
  'Child': { en: 'Child', es: 'Hijo/Hija' },
  'Spouse': { en: 'Spouse', es: 'Esposo/a' },
  'Sibling': { en: 'Sibling', es: 'Hermano/a' },
  'Step-Parent': { en: 'Step-Parent', es: 'Padrastro/Madrastra' },
  'Step-Child': { en: 'Step-Child', es: 'Hijastro/a' },
  'Step-Sibling': { en: 'Step-Sibling', es: 'Hermanastro/a' },
  'Half-Sibling': { en: 'Half-Sibling', es: 'Medio hermano/a' },
  'Cousin': { en: 'Cousin', es: 'Primo/a' },
  'Grandparent': { en: 'Grandparent', es: 'Abuelo/a' },
  'Grandchild': { en: 'Grandchild', es: 'Nieto/a' },
  'Great-Grandparent': { en: 'Great-Grandparent', es: 'Bisabuelo/a' },
  'Great-Grandchild': { en: 'Great-Grandchild', es: 'Bisnieto/a' },
  'Great-Great-Grandparent': { en: 'Great-Great-Grandparent', es: 'Tatarabuelo/a' },
  'Great-Great-Grandchild': { en: 'Great-Great-Grandchild', es: 'Tataranieto/a' },
  'Chosno-Ancestor': { en: 'Great-Great-Great-Grandparent', es: 'Trastatarabuelo/a' }, 
  'Chosno': { en: 'Great-Great-Great-Grandchild', es: 'Chosno/a' },
  'Aunt/Uncle': { en: 'Aunt/Uncle', es: 'Tío/a' },
  'Niece/Nephew': { en: 'Niece/Nephew', es: 'Sobrino/a' },
  'Sibling-in-law': { en: 'Sibling-in-law', es: 'Cuñado/a' },
  'Parent-in-law': { en: 'Parent-in-law', es: 'Suegro/a' },
  'Child-in-law': { en: 'Child-in-law', es: 'Yerno/Nuera' },
  'Godparent': { en: 'Godparent', es: 'Padrino/Madrina' },
  'Godchild': { en: 'Godchild', es: 'Ahijado/a' },
  'Ex-Spouse': { en: 'Ex-Spouse', es: 'Ex-Esposo/a' },
  'Separated': { en: 'Separated', es: 'Separado/a' },
  'Estranged': { en: 'Estranged', es: 'Distanciado/a' },
  'Friend': { en: 'Friend', es: 'Amigo/a' },
  'Other': { en: 'Other', es: 'Otro' },
  'are_Spouse': { en: 'are spouses', es: 'son esposos' },
  'are_Ex-Spouse': { en: 'were spouses', es: 'fueron esposos' },
  'are_Separated': { en: 'are separated', es: 'están separados' },
  'are_Estranged': { en: 'are estranged', es: 'están distanciados' },
  'are_Sibling': { en: 'are siblings', es: 'son hermanos' },
  'are_Step-Sibling': { en: 'are step-siblings', es: 'son hermanastros' },
  'are_Half-Sibling': { en: 'are half-siblings', es: 'son medios hermanos' },
  'are_Cousin': { en: 'are cousins', es: 'son primos' },
  'are_Friend': { en: 'are friends', es: 'son amigos' },
  'is': { en: 'is', es: 'es' },
  'to': { en: 'to', es: 'de' },
  'Add Relation': { en: 'Add Relation', es: 'Añadir Relación' },
  'Export': { en: 'Export', es: 'Exportar' },
  'Import': { en: 'Import', es: 'Importar' },
  'Relation': { en: 'Relation', es: 'Relación' },
  'Please fill all fields': { en: 'Please fill all fields', es: 'Por favor completa todos los campos' },
  'Cannot create relationship with themselves': { en: 'Cannot create relationship with themselves', es: 'No pueden tener relación consigo mismos' },
  'Relationship added!': { en: 'Relationship added!', es: '¡Relación añadida!' },
  'Are you sure you want to remove this connection?': { en: 'Are you sure you want to remove this connection?', es: '¿Seguro que quieres eliminar esta conexión?' },
  'Delete': { en: 'Delete', es: 'Eliminar' },
  'Cancel': { en: 'Cancel', es: 'Cancelar' },
  'Deceased': { en: 'Deceased', es: 'Fallecido/a' },
  'Mark as Deceased': { en: 'Mark as Deceased', es: 'Marcar como fallecido' },
  'Mark as Living': { en: 'Mark as Living', es: 'Marcar como vivo' },
  'View Photos': { en: 'View Photos', es: 'Ver fotos' },
  'Edit Birthday': { en: 'Edit Data', es: 'Editar datos' },
  'Relationship successfully purged!': { en: 'Relationship successfully purged!', es: '¡Relación eliminada exitosamente!' },
  'Failed to delete relationship.': { en: 'Failed to delete relationship.', es: 'Error al eliminar relación.' },
  'Error contacting server.': { en: 'Error contacting server.', es: 'Error al contactar el servidor.' },
  'Death Date': { en: 'Death Date', es: 'Fecha de fallecimiento' },
  'Marriage Date': { en: 'Marriage Date', es: 'Fecha de casamiento' },
  'Is Deceased': { en: 'Is Deceased', es: '¿Fallecido/a?' },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'es',
  setLang: () => {},
  t: (key) => key,
  formatDate: (date, formatStr) => dateFnsFormat(date, formatStr, { locale: es }),
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Language>('es'); // Default to spanish as requested

  useEffect(() => {
    const saved = localStorage.getItem('appLang');
    if (saved === 'en' || saved === 'es') setLang(saved);
  }, []);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('appLang', newLang);
  };

  const t = (key: string) => {
    return translations[key]?.[lang] || key;
  };

  const formatDate = (date: Date | number, formatStr: string) => {
    return dateFnsFormat(date, formatStr, { locale: lang === 'es' ? es : enUS });
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
