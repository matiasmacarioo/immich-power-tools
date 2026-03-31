"use client";
import { IPerson } from "@/types/person";
import React, { useRef, useState } from "react";
import { Avatar } from "../ui/avatar";
import { mergePerson, searchPeople, updatePerson } from "@/handlers/api/people.handler";
import { PersonMergeDropdown } from "./PersonMergeDropdown";
import PersonBirthdayCell from "./PersonBirthdayCell";
import clsx from "clsx";
import Link from "next/link";
import { ArrowUpRight, Info, Merge, Eye, EyeOff, Share2 } from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { useToast } from "../ui/use-toast";
import { Badge } from "../ui/badge";
import { Button } from "@/components/ui/button";
import ShareAssetsTrigger from "../shared/ShareAssetsTrigger";
import { Autocomplete, AutocompleteOption } from "../ui/autocomplete";
import { AlertDialog, IAlertDialogActions } from "../ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
interface IProps {
  person: IPerson;
  onRemove: (person: IPerson) => void;
}
export default function PersonItem({ person, onRemove }: IProps) {
  const { exImmichUrl } = useConfig();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(person);
  const selectedPerson = useRef<AutocompleteOption | null>(null);
  const mergeDialogRef = useRef<IAlertDialogActions>(null);

  const handleEdit = () => {
    if (formData.name && formData.name !== person.name) {
      setLoading(true);
      return updatePerson(person.id, {
        name: formData.name,
      })
        .then(() => {
          setEditMode(!editMode);
          toast({
            title: t("Success"),
            description: t("Person updated successfully"),
          });
        })
        .catch(() => {
          toast({
            title: t("Error"),
            description: t("Failed to update person"),
            variant: "destructive",
          });
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setEditMode(!editMode);
    }
  };

  const handleHide = (hidden: boolean) => {
    setLoading(true);
    return updatePerson(person.id, {
      isHidden: hidden,
    })
      .then(() => {
        setFormData((person) => ({
          ...person,
          isHidden: hidden,
        }));
      })
      .catch(() => { })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleMerge = async (option: AutocompleteOption) => {
    await mergePerson(person.id, [option.value]);
  };

  return (
    <div
      className={clsx(
        "flex flex-col rounded-lg pb-2 border border-2 border-transparent items-center gap-2 transition-[border-color,background-color,box-shadow]",
        {
          "opacity-50": formData.isHidden,
          "border border-blue-500": formData.name,
          "z-50": true,
          "hover:z-[100]": true,
        }
      )}
    >
      <div className="relative w-full h-auto group">
        <Avatar
          className="w-full min-h-full h-auto rounded-lg"
          src={person.thumbnailPath}
          alt={person.name}
        />
        <div className="absolute bottom-2 w-full flex justify-center items-center">
          <Badge variant={"secondary"} className="text-xs !font-medium font-mono">{person.assetCount} {t("Assets")}</Badge>
        </div>
        <div className="absolute top-2 left-2 flex md:hidden md:group-hover:flex items-center gap-2">
          <Link
            className="bg-green-300 block rounded-lg px-3 py-2 md:px-2 md:py-1 text-sm dark:text-gray-900"
            href={`${exImmichUrl}/people/${person.id}`}
            target="_blank"
          >
            <ArrowUpRight className="w-5 h-5 md:w-4 md:h-4" />
          </Link>
          <Link
            className="bg-gray-300 block rounded-lg px-3 py-2 md:px-2 md:py-1 text-sm dark:text-gray-900"
            href={`/people/${person.id}`}
          >
            <Info className="w-5 h-5 md:w-4 md:h-4" />
          </Link>
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <PersonMergeDropdown 
            person={person} 
            onRemove={onRemove} 
            triggerClassName="flex items-center justify-center w-10 md:w-8 h-10 md:h-8 px-0 border-none text-white bg-black/60 hover:bg-black/80 backdrop-blur-md shadow-lg transition-colors"
            triggerChildren={
              <>
                <Merge className="w-5 h-5 md:w-4 md:h-4" />
              </>
            }
          />
          <Button 
            variant="outline" 
            className="flex items-center justify-center w-10 md:w-8 h-10 md:h-8 px-0 border-none text-white bg-black/60 hover:bg-black/80 backdrop-blur-md shadow-lg transition-colors"
            onClick={() => handleHide(!formData.isHidden)}
          >
            {formData.isHidden ? <Eye className="w-5 h-5 md:w-4 md:h-4" /> : <EyeOff className="w-5 h-5 md:w-4 md:h-4" />}
          </Button>
          <ShareAssetsTrigger 
            filters={{ personIds: [person.id] }} 
            buttonProps={{ 
              variant: "outline", 
              className: "flex items-center justify-center w-10 md:w-8 h-10 md:h-8 px-0 border-none text-white bg-black/60 hover:bg-black/80 backdrop-blur-md shadow-lg transition-colors",
              children: (
                <>
                  <Share2 className="w-5 h-5 md:w-4 md:h-4" />
                </>
              )
            }} 
          />
        </div>
      </div>
      {!editMode ? (
        <h2
          className="text-lg text-center font-semibold hover:bg-gray-300 dark:hover:bg-gray-800 w-full px-2 py-1 rounded-lg"
          onClick={() => {
            setEditMode((prev) => !prev);
          }}
        >
          {formData.name ? (
            formData.name
          ) : (
            <span className="text-gray-400">{t("Unknown")}</span>
          )}
        </h2>
      ) : (
        <Autocomplete
          loadOptions={(query: string) => searchPeople(query).then((people) => people.map((person: any) => ({
            label: person.name, value: person.id,
            imageUrl: person.thumbnailPath
          })))}
          type="text"
          className="text-lg font-semibold text-center w-full px-2 py-1 rounded-lg"
          defaultValue={formData.name}
          placeholder={t("Enter name")}
          autoFocus
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
          }}
          value={formData.name}
          onOptionSelect={(value) => {
            mergeDialogRef.current?.open();
            selectedPerson.current = value;
          }}
          createNewLabel={t("Create")}
          disabled={loading}
          onCreateNew={(value) => {
            handleEdit();
          }}
        />
      )}
      <div className="flex flex-col gap-2">
        <PersonBirthdayCell person={person} />
      </div>

      <AlertDialog
        ref={mergeDialogRef}
        title={t("Merge Person")}
        description={t("Are you sure you want to merge this person with the selected person?")}
        onConfirm={() => {
          if (selectedPerson.current) {
            handleMerge(selectedPerson.current);
          }
        }}
        confirmLabel={t("Confirm")}
        cancelLabel={t("Cancel")}
      />
    </div>
  );
}
