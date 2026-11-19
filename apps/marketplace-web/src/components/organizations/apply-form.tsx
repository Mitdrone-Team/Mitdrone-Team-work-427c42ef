'use client';

import {
  api,
  getErrorMessage,
  useBackendOrgApplication,
  useBackendOrgApplyAsServiceProvider,
  useBackendOrgResubmitApplication,
  useBackendOrgResubmitServiceProviderApplication,
} from '@mitdrone/sdk';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@mitdrone/ui';
import { useEffect, useState } from 'react';

import type { BusinessType, Capability, ProviderType } from '@mitdrone/types';

const BUSINESS_TYPES: BusinessType[] = [
  'INDIVIDUAL_SELLER',
  'REGISTERED_COMPANY',
  'DISTRIBUTOR',
  'MANUFACTURER',
];
const CAPABILITIES: Capability[] = ['SALES', 'RENTALS', 'TRAINING'];
const PROVIDER_TYPES: ProviderType[] = ['INDIVIDUAL', 'COMPANY'];

function useTerms(kind: 'vendor' | 'serviceProvider') {
  const [version, setVersion] = useState('');
  useEffect(() => {
    let active = true;
    api.auth
      .registrationTerms()
      .then((terms) => {
        if (active) setVersion(terms[kind] ?? '');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [kind]);
  return version;
}

export function VendorApplicationForm({ resubmitOrgId }: { resubmitOrgId?: string }) {
  const termsVersion = useTerms('vendor');
  const create = useBackendOrgApplication();
  const resubmit = useBackendOrgResubmitApplication(resubmitOrgId ?? '');

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [name, setName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('REGISTERED_COMPANY');
  const [businessRegistrationDetails, setBusinessRegistrationDetails] = useState('');
  const [productCategories, setProductCategories] = useState('');
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState<Capability[]>(['SALES']);
  const [expectedVersion, setExpectedVersion] = useState('1');

  const pending = create.isPending || resubmit.isPending;

  const submit = async () => {
    const base = {
      acceptedTerms: true as const,
      termsVersion,
      name,
      businessEmail,
      phone,
      ownerFullName,
      businessAddress,
      location,
      businessType,
      businessRegistrationDetails,
      productCategories: productCategories
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      description,
      capabilities,
    };
    try {
      if (resubmitOrgId) {
        await resubmit.mutateAsync({ ...base, expectedVersion: Number(expectedVersion) || 1 });
        toast.success('Application resubmitted');
      } else {
        await create.mutateAsync(base);
        toast.success('Application submitted');
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{resubmitOrgId ? 'Resubmit vendor application' : 'Apply to become a vendor'}</CardTitle>
        <CardDescription>Tell us about your business and how you sell.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" value={name} onChange={setName} />
          <Field label="Business email" value={businessEmail} onChange={setBusinessEmail} type="email" />
          <Field label="Phone" value={phone} onChange={setPhone} />
          <Field label="Owner full name" value={ownerFullName} onChange={setOwnerFullName} />
          <Field label="Business address" value={businessAddress} onChange={setBusinessAddress} />
          <Field label="Location (city, state)" value={location} onChange={setLocation} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="biz-type">Business type</Label>
          <Select value={businessType} onValueChange={(v) => setBusinessType(v as BusinessType)}>
            <SelectTrigger id="biz-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Field
          label="Business registration details"
          value={businessRegistrationDetails}
          onChange={setBusinessRegistrationDetails}
        />
        <Field
          label="Product categories (comma separated)"
          value={productCategories}
          onChange={setProductCategories}
        />
        <div className="space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Capabilities</Label>
          <div className="flex flex-wrap gap-4">
            {CAPABILITIES.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={capabilities.includes(c)}
                  onChange={(e) =>
                    setCapabilities((prev) =>
                      e.target.checked ? [...prev, c] : prev.filter((x) => x !== c),
                    )
                  }
                />
                {c}
              </label>
            ))}
          </div>
        </div>
        {resubmitOrgId ? (
          <Field label="Expected version" value={expectedVersion} onChange={setExpectedVersion} />
        ) : null}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1"
          />
          <span>
            I accept the current Mitdrone terms of service and privacy policy.
            {termsVersion ? <span className="text-muted-foreground"> (terms version: {termsVersion})</span> : null}
          </span>
        </label>
        <Button
          loading={pending}
          disabled={!acceptedTerms || !name || !businessEmail}
          onClick={() => void submit()}
        >
          {resubmitOrgId ? 'Resubmit application' : 'Submit application'}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ServiceProviderApplicationForm({ resubmitOrgId }: { resubmitOrgId?: string }) {
  const termsVersion = useTerms('serviceProvider');
  const create = useBackendOrgApplyAsServiceProvider();
  const resubmit = useBackendOrgResubmitServiceProviderApplication(resubmitOrgId ?? '');

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [name, setName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [serviceCoverage, setServiceCoverage] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('COMPANY');
  const [serviceCategories, setServiceCategories] = useState('');
  const [experience, setExperience] = useState('');
  const [equipmentAndCapabilities, setEquipmentAndCapabilities] = useState('');
  const [certificationsOrLicences, setCertificationsOrLicences] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [expectedVersion, setExpectedVersion] = useState('1');

  const pending = create.isPending || resubmit.isPending;

  const submit = async () => {
    const base = {
      acceptedTerms: true as const,
      termsVersion,
      name,
      businessEmail,
      phone,
      location,
      serviceCoverage,
      providerType,
      serviceCategories: serviceCategories
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      experience,
      equipmentAndCapabilities,
      certificationsOrLicences,
      portfolio,
    };
    try {
      if (resubmitOrgId) {
        await resubmit.mutateAsync({ ...base, expectedVersion: Number(expectedVersion) || 1 });
        toast.success('Application resubmitted');
      } else {
        await create.mutateAsync(base);
        toast.success('Application submitted');
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {resubmitOrgId ? 'Resubmit service provider application' : 'Apply as a service provider'}
        </CardTitle>
        <CardDescription>Offer drone services to buyers on Mitdrone.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" value={name} onChange={setName} />
          <Field label="Business email" value={businessEmail} onChange={setBusinessEmail} type="email" />
          <Field label="Phone" value={phone} onChange={setPhone} />
          <Field label="Location" value={location} onChange={setLocation} />
          <Field label="Service coverage" value={serviceCoverage} onChange={setServiceCoverage} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="provider-type">Provider type</Label>
          <Select value={providerType} onValueChange={(v) => setProviderType(v as ProviderType)}>
            <SelectTrigger id="provider-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Field
          label="Service categories (comma separated)"
          value={serviceCategories}
          onChange={setServiceCategories}
        />
        <div className="space-y-1.5">
          <Label htmlFor="exp">Experience</Label>
          <Textarea id="exp" value={experience} onChange={(e) => setExperience(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="equip">Equipment and capabilities</Label>
          <Textarea
            id="equip"
            value={equipmentAndCapabilities}
            onChange={(e) => setEquipmentAndCapabilities(e.target.value)}
          />
        </div>
        <Field
          label="Certifications or licences"
          value={certificationsOrLicences}
          onChange={setCertificationsOrLicences}
        />
        <Field label="Portfolio" value={portfolio} onChange={setPortfolio} />
        {resubmitOrgId ? (
          <Field label="Expected version" value={expectedVersion} onChange={setExpectedVersion} />
        ) : null}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1"
          />
          <span>
            I accept the current Mitdrone terms of service and privacy policy.
            {termsVersion ? <span className="text-muted-foreground"> (terms version: {termsVersion})</span> : null}
          </span>
        </label>
        <Button
          loading={pending}
          disabled={!acceptedTerms || !name || !businessEmail}
          onClick={() => void submit()}
        >
          {resubmitOrgId ? 'Resubmit application' : 'Submit application'}
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
