import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { format as dateFnsFormat } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

type Language = 'en' | 'es';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, gender?: 'male' | 'female' | 'other' | null) => string;
  formatDate: (date: Date | number, formatStr: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  'Parent': { en: 'Parent', es: 'Padre/Madre' },
  'Parent_male': { en: 'Father', es: 'Padre' },
  'Parent_female': { en: 'Mother', es: 'Madre' },
  'Child': { en: 'Child', es: 'Hijo/Hija' },
  'Child_male': { en: 'Son', es: 'Hijo' },
  'Child_female': { en: 'Daughter', es: 'Hija' },
  'Spouse': { en: 'Spouse', es: 'Esposo/a' },
  'Spouse_male': { en: 'Husband', es: 'Esposo' },
  'Spouse_female': { en: 'Wife', es: 'Esposa' },
  'Sibling': { en: 'Sibling', es: 'Hermano/a' },
  'Sibling_male': { en: 'Brother', es: 'Hermano' },
  'Sibling_female': { en: 'Sister', es: 'Hermana' },
  'Step-Parent': { en: 'Step-Parent', es: 'Padrastro/Madrastra' },
  'Step-Parent_male': { en: 'Step-Father', es: 'Padrastro' },
  'Step-Parent_female': { en: 'Step-Mother', es: 'Madrastra' },
  'Step-Child': { en: 'Step-Child', es: 'Hijastro/a' },
  'Step-Child_male': { en: 'Step-Son', es: 'Hijastro' },
  'Step-Child_female': { en: 'Step-Daughter', es: 'Hijastra' },
  'Step-Sibling': { en: 'Step-Sibling', es: 'Hermanastro/a' },
  'Step-Sibling_male': { en: 'Step-Brother', es: 'Hermanastro' },
  'Step-Sibling_female': { en: 'Step-Sister', es: 'Hermanastra' },
  'Half-Sibling': { en: 'Half-Sibling', es: 'Medio hermano/a' },
  'Half-Sibling_male': { en: 'Half-Brother', es: 'Medio hermano' },
  'Half-Sibling_female': { en: 'Half-Sister', es: 'Media hermana' },
  'Cousin': { en: 'Cousin', es: 'Primo/a' },
  'Cousin_male': { en: 'Cousin (M)', es: 'Primo' },
  'Cousin_female': { en: 'Cousin (F)', es: 'Prima' },
  'Grandparent': { en: 'Grandparent', es: 'Abuelo/a' },
  'Grandparent_male': { en: 'Grandfather', es: 'Abuelo' },
  'Grandparent_female': { en: 'Grandmother', es: 'Abuela' },
  'Grandchild': { en: 'Grandchild', es: 'Nieto/a' },
  'Grandchild_male': { en: 'Grandson', es: 'Nieto' },
  'Grandchild_female': { en: 'Granddaughter', es: 'Nieta' },
  'Great-Grandparent': { en: 'Great-Grandparent', es: 'Bisabuelo/a' },
  'Great-Grandparent_male': { en: 'Great-Grandfather', es: 'Bisabuelo' },
  'Great-Grandparent_female': { en: 'Great-Grandmother', es: 'Bisabuela' },
  'Great-Grandchild': { en: 'Great-Grandchild', es: 'Bisnieto/a' },
  'Great-Grandchild_male': { en: 'Great-Grandson', es: 'Bisnieto' },
  'Great-Grandchild_female': { en: 'Great-Granddaughter', es: 'Bisnieta' },
  'Great-Great-Grandparent': { en: 'Great-Great-Grandparent', es: 'Tatarabuelo/a' },
  'Great-Great-Grandparent_male': { en: 'Great-Great-Grandfather', es: 'Tatarabuelo' },
  'Great-Great-Grandparent_female': { en: 'Great-Great-Grandmother', es: 'Tatarabuela' },
  'Great-Great-Grandchild': { en: 'Great-Great-Grandchild', es: 'Tataranieto/a' },
  'Great-Great-Grandchild_male': { en: 'Great-Great-Grandson', es: 'Tataranieto' },
  'Great-Great-Grandchild_female': { en: 'Great-Great-Granddaughter', es: 'Tataranieta' },
  'Chosno-Ancestor': { en: 'Great-Great-Great-Grandparent', es: 'Trastatarabuelo/a' }, 
  'Chosno-Ancestor_male': { en: 'Great-Great-Great-Grandfather', es: 'Trastatarabuelo' },
  'Chosno-Ancestor_female': { en: 'Great-Great-Great-Grandmother', es: 'Trastatarabuela' },
  'Chosno': { en: 'Great-Great-Great-Grandchild', es: 'Chosno/a' },
  'Chosno_male': { en: 'Great-Great-Great-Grandson', es: 'Chosno' },
  'Chosno_female': { en: 'Great-Great-Great-Granddaughter', es: 'Chosna' },
  'Aunt/Uncle': { en: 'Aunt/Uncle', es: 'Tío/a' },
  'Aunt/Uncle_male': { en: 'Uncle', es: 'Tío' },
  'Aunt/Uncle_female': { en: 'Aunt', es: 'Tía' },
  'Great-Aunt/Uncle': { en: 'Great-Aunt/Uncle', es: 'Tío/a abuelo/a' },
  'Great-Aunt/Uncle_male': { en: 'Great-Uncle', es: 'Tío abuelo' },
  'Great-Aunt/Uncle_female': { en: 'Great-Aunt', es: 'Tía abuela' },
  'Niece/Nephew': { en: 'Niece/Nephew', es: 'Sobrino/a' },
  'Niece/Nephew_male': { en: 'Nephew', es: 'Sobrino' },
  'Niece/Nephew_female': { en: 'Niece', es: 'Sobrina' },
  'Great-Niece/Nephew': { en: 'Great-Niece/Nephew', es: 'Sobrino/a nieto/a' },
  'Great-Niece/Nephew_male': { en: 'Great-Nephew', es: 'Sobrino nieto' },
  'Great-Niece/Nephew_female': { en: 'Great-Niece', es: 'Sobrina nieta' },
  'First-Cousin-Once-Removed': { en: 'First Cousin Once Removed (Up)', es: 'Tío/a segundo/a' },
  'First-Cousin-Once-Removed_male': { en: 'First Cousin Once Removed (Up)', es: 'Tío segundo' },
  'First-Cousin-Once-Removed_female': { en: 'First Cousin Once Removed (Up)', es: 'Tía segunda' },
  'First-Cousin-Once-Removed-Down': { en: 'First Cousin Once Removed (Down)', es: 'Sobrino/a segundo/a' },
  'First-Cousin-Once-Removed-Down_male': { en: 'First Cousin Once Removed (Down)', es: 'Sobrino segundo' },
  'First-Cousin-Once-Removed-Down_female': { en: 'First Cousin Once Removed (Down)', es: 'Sobrina segunda' },
  'Deceased': { en: 'Deceased', es: 'Fallecido/a' },
  'Sibling-in-law': { en: 'Sibling-in-law', es: 'Cuñado/a' },
  'Sibling-in-law_male': { en: 'Brother-in-law', es: 'Cuñado' },
  'Sibling-in-law_female': { en: 'Sister-in-law', es: 'Cuñada' },
  'Parent-in-law': { en: 'Parent-in-law', es: 'Suegro/a' },
  'Parent-in-law_male': { en: 'Father-in-law', es: 'Suegro' },
  'Parent-in-law_female': { en: 'Mother-in-law', es: 'Suegra' },
  'Grandparent-in-law': { en: 'Grandparent-in-law', es: 'Abuelo/a político/a' },
  'Grandparent-in-law_male': { en: 'Grandfather-in-law', es: 'Abuelo político' },
  'Grandparent-in-law_female': { en: 'Grandmother-in-law', es: 'Abuela política' },
  'Great-grandparent-in-law': { en: 'Great-grandparent-in-law', es: 'Bisabuelo/a político/a' },
  'Great-grandparent-in-law_male': { en: 'Great-grandfather-in-law', es: 'Bisabuelo político' },
  'Great-grandparent-in-law_female': { en: 'Great-grandmother-in-law', es: 'Bisabuela política' },
  'Child-in-law': { en: 'Child-in-law', es: 'Yerno/Nuera' },
  'Child-in-law_male': { en: 'Son-in-law', es: 'Yerno' },
  'Child-in-law_female': { en: 'Daughter-in-law', es: 'Nuera' },
  'Grandchild-in-law': { en: 'Grandchild-in-law', es: 'Nieto/a político/a' },
  'Grandchild-in-law_male': { en: 'Grandson-in-law', es: 'Nieto político' },
  'Grandchild-in-law_female': { en: 'Granddaughter-in-law', es: 'Nieta política' },
  'Great-grandchild-in-law': { en: 'Great-grandchild-in-law', es: 'Bisnieto/a político/a' },
  'Great-grandchild-in-law_male': { en: 'Great-grandson-in-law', es: 'Bisnieto político' },
  'Great-grandchild-in-law_female': { en: 'Great-granddaughter-in-law', es: 'Bisnieta política' },
  'Godparent': { en: 'Godparent', es: 'Padrino/Madrina' },
  'Godparent_male': { en: 'Godfather', es: 'Padrino' },
  'Godparent_female': { en: 'Godmother', es: 'Madrina' },
  'Godchild': { en: 'Godchild', es: 'Ahijado/a' },
  'Godchild_male': { en: 'Godchild (M)', es: 'Ahijado' },
  'Godchild_female': { en: 'Godchild (F)', es: 'Ahijada' },
  'Ex-Spouse': { en: 'Ex-Spouse', es: 'Ex-Esposo/a' },
  'Ex-Spouse_male': { en: 'Ex-Husband', es: 'Ex-Esposo' },
  'Ex-Spouse_female': { en: 'Ex-Wife', es: 'Ex-Esposa' },
  'Separated': { en: 'Separated', es: 'Separado/a' },
  'Estranged': { en: 'Estranged', es: 'Distanciado/a' },
  'Friend': { en: 'Friend', es: 'Amigo/a' },
  'Other': { en: 'Other', es: 'Otro/a' },
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
  'Gender': { en: 'Gender', es: 'Género' },
  'Male': { en: 'Male', es: 'Hombre' },
  'Female': { en: 'Female', es: 'Mujer' },
  'Mark as Woman': { en: 'Mark as Woman', es: 'Marcar como mujer' },
  'Mark as Man': { en: 'Mark as Man', es: 'Marcar como hombre' },
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

  const t = (key: string, gender?: 'male' | 'female' | 'other' | null) => {
    const g = (gender === 'female') ? 'female' : 'male';
    const gKey = `${key}_${g}`;
    if (translations[gKey]) return translations[gKey][lang];
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
