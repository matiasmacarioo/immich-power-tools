import "yet-another-react-lightbox/styles.css";

import { IAsset } from '@/types/asset';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox';
import { Gallery } from "react-grid-gallery";
import LazyGridImage from "../ui/lazy-grid-image";
import Download from "yet-another-react-lightbox/plugins/download";
import Video from "yet-another-react-lightbox/plugins/video";
import { usePhotoSelectionContext } from '@/contexts/PhotoSelectionContext';
import { ExternalLink } from 'lucide-react';
import { useConfig } from '@/contexts/ConfigContext';


interface AssetGridProps {
  assets: IAsset[];
  isInternal?: boolean;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
}

interface AssetGridRef {
  getSelectedIds: () => string[];
  selectAll: () => void;
  unselectAll: () => void;
}

const AssetGrid = forwardRef<AssetGridRef, AssetGridProps>(({ assets, isInternal = true, selectable = false, onSelectionChange }, ref) => {
  const [index, setIndex] = useState(-1);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(-1);
  const { exImmichUrl } = useConfig();
  // Use context for selection state
  const { selectedIds, updateContext } = usePhotoSelectionContext();

  useImperativeHandle(ref, () => ({
    getSelectedIds: () => selectedIds,
    selectAll: () => {
      const allIds = assets.map((asset) => asset.id);
      updateContext({ selectedIds: allIds });
      onSelectionChange?.(allIds);
    },
    unselectAll: () => {
      updateContext({ selectedIds: [] });
      onSelectionChange?.([]);
    },
  }), [assets, selectedIds, updateContext]);


  const handleClick = (index: number, asset: IAsset, event: React.MouseEvent<HTMLElement>) => {
    if (selectedIds.length > 0) {
      handleSelect(index, asset, event);
    } else {
      setIndex(index);
    }
  }

  const handleSelect = (_idx: number, asset: IAsset, event: React.MouseEvent<HTMLElement>) => {

    event.stopPropagation();
    const isPresent = selectedIds.includes(asset.id);
    if (isPresent) {
      const newSelectedIds = selectedIds.filter((id) => id !== asset.id);
      updateContext({ selectedIds: newSelectedIds });
      onSelectionChange?.(newSelectedIds);
    } else {
      const clickedIndex = images.findIndex((image) => {
        return image.id === asset.id;
      });
      if (event.shiftKey) {
        const startIndex = Math.min(clickedIndex, lastSelectedIndex);
        const endIndex = Math.max(clickedIndex, lastSelectedIndex);
        const rangeSelectedIds = images.slice(startIndex, endIndex + 1).map((image) => image.id);
        const allSelectedIds = [...selectedIds, ...rangeSelectedIds];
        const uniqueSelectedIds = [...new Set(allSelectedIds)];
        updateContext({ selectedIds: uniqueSelectedIds });
        onSelectionChange?.(uniqueSelectedIds);
      } else {
        const newSelectedIds = [...selectedIds, asset.id];
        updateContext({ selectedIds: newSelectedIds });
        onSelectionChange?.(newSelectedIds);
      }
      setLastSelectedIndex(clickedIndex);
    }
  };

  const slides = useMemo(() => {
    return assets.map((asset) => ({
      ...asset,
      orientation: 1,
      src: asset.previewUrl as string,
      type: (asset.type === "VIDEO" ? "video" : "image") as any,
      sources:
        asset.type === "VIDEO"
          ? [
            {
              src: asset.downloadUrl as string,
              type: "video/mp4",
            },
          ]
          : undefined,
      height: asset.exifImageHeight as number,
      width: asset.exifImageWidth as number,
      downloadUrl: asset.downloadUrl as string,
    }));
  }, [assets]);

  const images = useMemo(() => {
    return assets.map((p) => ({
      ...p,
      src: p.url as string,
      original: p.previewUrl as string,
      width: p.exifImageWidth / 10 as number,
      height: p.exifImageHeight / 10 as number,
      orientation: 1,
      isSelected: selectedIds.includes(p.id),
      isVideo: p.type === "VIDEO",
      tags: [
        {
          title: "Open in Immich",
          value: (
            <a
              href={exImmichUrl + "/photos/" + p.id}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in Immich"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                textDecoration: "none",
                transition: "background 0.2s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.8)";
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.5)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <ExternalLink size={13} strokeWidth={2} />
            </a>
          ),
        },
      ],
    }));
  }, [assets, selectedIds, exImmichUrl]);

  const handleEsc = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      updateContext({ selectedIds: [] });
      onSelectionChange?.([]);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [images]);

  // While the lightbox is open, intercept Escape in the capture phase so it
  // never reaches the parent Radix Dialog (which would close the whole card).
  useEffect(() => {
    if (index < 0) return;
    const blockEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", blockEscape, true);
    return () => document.removeEventListener("keydown", blockEscape, true);
  }, [index]);

  return (
    <div>
      <Lightbox
        slides={slides}
        plugins={[Download, Video]}
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        controller={{ closeOnBackdropClick: true }}
        on={{
          click: (e: any) => e?.stopPropagation?.(),
        }}
      />
      <Gallery
        images={images}
        onClick={handleClick}
        enableImageSelection={selectable}
        thumbnailImageComponent={LazyGridImage}
        onSelect={handleSelect}
        tagStyle={{
          background: "transparent",
          color: "inherit",
          padding: 0,
          borderRadius: 0,
          fontWeight: "inherit",
          fontSize: "inherit",
          lineHeight: "inherit",
          whiteSpace: "normal",
          verticalAlign: "middle",
        }}
      />
    </div>
  );
})
AssetGrid.displayName = "AssetGrid";
export default AssetGrid;
