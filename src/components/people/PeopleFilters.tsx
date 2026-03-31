import { useRouter } from "next/router";
import { useMemo } from "react";
import { ImportExportDropdown } from "./ImportExportDropdown";
import { Button } from "../ui/button";
import { ArrowLeft, ArrowRight, SortAsc, SortDesc } from "lucide-react";
import { usePeopleFilterContext } from "@/contexts/PeopleFilterContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { IPersonListFilters } from "@/handlers/api/people.handler";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { removeNullOrUndefinedProperties } from "@/helpers/data.helper";

export function PeopleFilters() {
  const router = useRouter();
  const { t } = useLanguage();
  const filters = usePeopleFilterContext();
  const { updateContext, page, maximumAssetCount, type = "all", query = "", visibility = "all" } = filters;

  const handleChange = (data: Partial<IPersonListFilters>) => {
    updateContext(data);
    router.push({
      pathname: router.pathname,
      query: {
        ...router.query,
        ...data,  
        page: data.page || undefined,
        type: data.type || undefined,
        visibility: data.visibility || undefined,
        query: data.query || undefined,
        maximumAssetCount: data.maximumAssetCount || undefined,
        sort: data.sort || undefined,
        sortOrder: data.sortOrder || undefined,
      },
    });
  }
  const [nextPage, prevPage] = useMemo(() => {
    const pageNum = parseInt(page.toString() || "1", 10);
    return [pageNum + 1, pageNum - 1];
  }, [page]);

  return (
    <div className="flex gap-2">
      <Input
        type="text"
        placeholder={t("Search by name")}
        className="w-max"
        defaultValue={query}
        onChange={(e) => {
          handleChange({ query: e.target.value });
        }}
      />
      <Input
        type="number"
        placeholder={t("Max Asset Count")}
        defaultValue={maximumAssetCount}
        onChange={(e) => {
          try {
            const value = parseInt(e.target.value || "0", 10);
            handleChange({ maximumAssetCount: value });
          } catch (e) {
            handleChange({ maximumAssetCount: 0 });
          }
        }}
      />

      <Select value={type} onValueChange={(value) => handleChange({ 
        ...removeNullOrUndefinedProperties(filters),
        type: value as "all" | "nameless" | "named" 
      })}>
        <SelectTrigger>
          <SelectValue placeholder={t("Person Type")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("All")}</SelectItem>
          <SelectItem value="nameless">{t("Nameless")}</SelectItem>
          <SelectItem value="named">{t("Named")}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={visibility} onValueChange={(value) => handleChange({ 
        ...removeNullOrUndefinedProperties(filters),
          visibility: value as "all" | "visible" | "hidden" 
        })}>
        <SelectTrigger>
          <SelectValue placeholder={t("Visibility")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("All")}</SelectItem>
          <SelectItem value="visible">{t("Visible")}</SelectItem>
          <SelectItem value="hidden">{t("Hidden")}</SelectItem>
        </SelectContent>
      </Select>

      <Button
        disabled={prevPage < 1}
        onClick={() => handleChange({ page: prevPage })}
      >
        <ArrowLeft size={16} />
      </Button>

      <Button onClick={() => handleChange({ page: nextPage })}>
        <ArrowRight size={16} />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"secondary"}
            onClick={() => handleChange({ page: nextPage })}
          >
            <SortDesc size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() =>
              handleChange({ sort: "assetCount", sortOrder: "asc" })
            }
          >
            <SortAsc size={16} />
            <span>{t("Asset Count - ASC")}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              handleChange({ sort: "assetCount", sortOrder: "desc" })
            }
          >
            <SortDesc size={16} />
            <span>{t("Asset Count - DESC")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() =>
              handleChange({ sort: "updatedAt", sortOrder: "asc" })
            }
          >
            <SortAsc size={16} />
            <span>{t("Updated At - ASC")}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              handleChange({ sort: "updatedAt", sortOrder: "desc" })
            }
          >
            <SortDesc size={16} />
            <span>{t("Updated At - DESC")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              handleChange({ sort: "coOccurringNamed", sortOrder: "desc" })
            }
          >
            <SortDesc size={16} />
            <span>{t("Named Co-occurrences - DESC")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              handleChange({ sort: "coOccurringNamed", sortOrder: "asc" })
            }
          >
            <SortAsc size={16} />
            <span>{t("Named Co-occurrences - ASC")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <ImportExportDropdown />
    </div>
  );
}
