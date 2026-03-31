import { IPersonListFilters, listPeople } from "@/handlers/api/people.handler";
import { IPerson } from "@/types/person";
import React, { useEffect, useState } from "react";
import Loader from "../ui/loader";
import PersonItem from "./PersonItem";
import { PeopleFilters } from "./PeopleFilters";
import { useRouter } from "next/router";
import PeopleFilterContext from "@/contexts/PeopleFilterContext";
import PageLayout from "../layouts/PageLayout";
import Header from "../shared/Header";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PeopleList() {
  const router = useRouter();
  const { t } = useLanguage();
  const [people, setPeople] = useState<IPerson[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<IPersonListFilters>({
    sort: "coOccurringNamed",
    sortOrder: "desc",
    type: "nameless",
    ...router.query,
    page: 1,
  });


  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    return listPeople(filters)
      .then((response) => {
        setPeople(response.people);
        setCount(response.total);
      })
      .catch((error) => {
        setErrorMessage(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleRemove = (person: IPerson) => {
    setPeople((prev) => prev.filter((p) => {
      return p.id !== person.id
    }));
  }

  useEffect(() => {
    if (!router.isReady) return;
    fetchData();
  }, [filters]);


  const renderContent = () => {
    if (loading) return <Loader />;
    if (errorMessage) return <div>{errorMessage}</div>;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-8 gap-4 p-4">
        {people.map((person) => (
          <PersonItem person={person} key={person.id} onRemove={handleRemove} />
        ))}
      </div>
    );
  };
  return (
    <PeopleFilterContext.Provider
      value={{
        ...filters,
        updateContext: (newConfig) =>
          setFilters((prev) => ({ ...prev, ...newConfig })),
      }}
    >
      <PageLayout className="!p-0 !mb-0">
        <Header
          leftComponent={t("Manage People")}
          rightComponent={<PeopleFilters />}
        />
        {renderContent()}
      </PageLayout>
    </PeopleFilterContext.Provider>
  );
}
