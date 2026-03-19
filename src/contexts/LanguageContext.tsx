import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'es';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
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
  'Friend': { en: 'Friend', es: 'Amigo/a' },
  'Other': { en: 'Other', es: 'Otro' },
  'are_Spouse': { en: 'are spouses', es: 'son esposos' },
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
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'es',
  setLang: () => {},
  t: (key) => key,
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

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
