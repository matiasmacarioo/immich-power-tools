import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogHeader, DialogTrigger, DialogDescription } from '../ui/dialog';
import { Button, ButtonProps } from '../ui/button';
import { ShareLinkFilters } from '@/types/shareLink';
import { generateShareLink } from '@/handlers/api/shareLink.handler';
import { Input } from '../ui/input';
import { Label } from '@radix-ui/react-label';

import { Switch } from '../ui/switch';
import { Select, SelectValue, SelectContent, SelectItem, SelectTrigger } from '../ui/select';

interface ShareAssetsTriggerProps {
  filters: ShareLinkFilters
  buttonProps?: ButtonProps
}

import { useLanguage } from "@/contexts/LanguageContext"

interface ShareAssetsTriggerProps {
  filters: ShareLinkFilters
  buttonProps?: ButtonProps
}

export default function ShareAssetsTrigger({ filters, buttonProps }: ShareAssetsTriggerProps) {
  const { t } = useLanguage();
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<Partial<ShareLinkFilters>>({
    expiresIn: "never"
  });

  const handleReset = () => {
    setConfig({ expiresIn: "never" });
    setGeneratedLink(null);
  }

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMessage(null);
    return generateShareLink({ ...filters, ...config }).then(({ link }) => {
      setGeneratedLink(link);
    }).catch((err) => {
      setErrorMessage(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  }


  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button {...buttonProps}>{buttonProps?.children || t('Share')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Share Assets")}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t("Share instruction")}
        </DialogDescription>
        {errorMessage && <div className="text-red-500">{errorMessage}</div>}
        {generatedLink ? <div className="flex flex-col gap-2">
          <Label className='text-sm'>{t("Share Link")}</Label>
          <Input readOnly type="text" value={generatedLink} />
          <p className='text-xs text-muted-foreground'>
            {t("Share link help")}
          </p>
          <div className="flex gap-2">
            <Button className="w-full" onClick={handleCopy}>{copied ? t('Copied') : t('Copy')}</Button>
            <Button className="w-full" variant="outline" onClick={handleReset}>{t("Generate New Link")}</Button>
          </div>
        </div> : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-1">
              <div className="flex flex-col gap-1">
                <Label className="text-sm m-0">{t("Show People")}</Label>
                <p className="text-xs text-muted-foreground m-0">
                  {t("Show people help")}
                </p>
              </div>
              <Switch checked={config.p} onCheckedChange={(checked) => setConfig({ ...config, p: !!checked })} />
            </div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex flex-col gap-1">
                <Label className="text-sm m-0">{t("Link Expires In")}</Label>
                <p className="text-xs text-muted-foreground m-0">
                  {t("Expires help")}
                </p>
              </div>
              <Select onValueChange={(value) => setConfig({ ...config, expiresIn: value })}>
                <SelectTrigger className='w-fit'>
                  <SelectValue placeholder={t("Select duration")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">{t("1 Hour")}</SelectItem>
                  <SelectItem value="1d">{t("1 Day (24 Hours)")}</SelectItem>
                  <SelectItem value="7d">{t("7 Days")}</SelectItem>
                  <SelectItem value="30d">{t("30 Days")}</SelectItem>
                  <SelectItem value="90d">{t("90 Days")}</SelectItem>
                  <SelectItem value="never">{t("Never Expires")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={loading}>{t("Generate Share Link")}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
