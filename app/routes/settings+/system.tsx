import type { ActionFunction, LoaderFunction, MetaFunction } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { authLoaderGetAuth, authLoaderWithPerm } from '~/util/auth';
import { getSupportedTimeZone } from '~/util/timezone';
import {
  configApplicationVersion,
  configApplicationEmail,
} from '~/util/config';
import { NavSettings } from '~/routes/settings/nav';
import { MainContainer } from '~/frontend/container';
import {
  updateFooterUrlPrivacyPolicy,
  updateFooterUrlTermsConditions,
} from '~/db/queries/instanceSystemSetting';
import { getSystemInfo, SystemInfo } from '~/db/queries/dtsSystemInfo';
import { getCurrenciesAsListFromCommaSeparated } from '~/util/currency';
import { InstanceSystemSettings } from '~/drizzle/schema';

import { getTenantContext } from '~/util/tenant';
import { getInstanceSystemSettingsByCountryAccount } from '~/db/queries/instanceSystemSetting';

// Define the loader data type
interface LoaderData {
  message: string;
  currencyArray: string[];
  timeZonesArray: string[];
  appVersion: string | undefined;
  systemLanguage: string[];
  ctryInstanceName: string;
  confEmailObj: {
    EMAIL_TRANSPORT: string;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_SECURE?: string;
  };
  confCtryInstanceISO: string;
  conf2FAIssuer: string;
  confInstanceTypePublic: boolean;
  instanceSystemSettings: InstanceSystemSettings | null;
  dtsSystemInfo: SystemInfo | null;
}

export const loader: LoaderFunction = authLoaderWithPerm('ViewData', async (loaderArgs) => {
  const { user } = authLoaderGetAuth(loaderArgs);

  // Get tenant context
  const userSession = { user, session: { id: '', userId: user.id, lastActiveAt: new Date(), totpAuthed: false }, sessionId: '' };
  const tenantContext = await getTenantContext(userSession);

  const settings = await getInstanceSystemSettingsByCountryAccount(tenantContext.countryAccountId);
  let approvedRecordsArePublic = false;
  let currencies: string[] = [];
  let confCtryInstanceISO = "USA";
  let totpIssuer = "example-app";
  if (settings) {
    approvedRecordsArePublic = settings.approvedRecordsArePublic;
    currencies = getCurrenciesAsListFromCommaSeparated(settings.currencyCodes);
    confCtryInstanceISO = settings.dtsInstanceCtryIso3;
    totpIssuer = settings.totpIssuer;
  }

  const timeZones: string[] = getSupportedTimeZone();
  const currency: string[] = currencies;
  const systemLanguage: string[] = ['English'];
  const confEmailObj = configApplicationEmail();
  const conf2FAIssuer = totpIssuer;
  const confInstanceTypePublic = approvedRecordsArePublic;

  let ctryInstanceName: string = '';

  const dtsSystemInfo = await getSystemInfo();

  const confAppVersion = await configApplicationVersion()
    .then((version) => version)
    .catch((error) => {
      console.error('Error:', error);
      return undefined;
    });

  if (confCtryInstanceISO !== '') {
    const url =
      'https://data.undrr.org/api/json/gis/countries/1.0.0/?cca3=' +
      confCtryInstanceISO.toUpperCase();
    const resp = await fetch(url);
    try {
      const res = await resp.json();
      ctryInstanceName = res.data[0].name;
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return Response.json({
    message: `Hello ${user.email}`,
    currencyArray: currency,
    timeZonesArray: timeZones,
    appVersion: confAppVersion,
    systemLanguage,
    ctryInstanceName,
    confEmailObj,
    confCtryInstanceISO,
    conf2FAIssuer,
    confInstanceTypePublic,
    instanceSystemSettings: settings,
    dtsSystemInfo,
  });
});

export const action: ActionFunction = authLoaderWithPerm('EditData', async (args) => {

  const { user } = authLoaderGetAuth(args);
  const request = args.request;

  // Get tenant context
  const userSession = { user, session: { id: '', userId: user.id, lastActiveAt: new Date(), totpAuthed: false }, sessionId: '' };
  const tenantContext = await getTenantContext(userSession);

  const formData = await request.formData();
  const termsConditionsUrl = formData.get('termsConditionsUrl') as string | null;
  const privacyPolicyUrl = formData.get('privacyPolicyUrl') as string | null;

  try {
    if (termsConditionsUrl !== null) {
      const value = termsConditionsUrl === '' ? null : termsConditionsUrl;
      const updated = await updateFooterUrlTermsConditions(tenantContext.countryAccountId, value);
      return Response.json({ success: true, updated, field: 'termsConditions' });
    }
    if (privacyPolicyUrl !== null) {
      const value = privacyPolicyUrl === '' ? null : privacyPolicyUrl;
      const updated = await updateFooterUrlPrivacyPolicy(tenantContext.countryAccountId, value);
      return Response.json({ success: true, updated, field: 'privacyPolicy' });
    }
    return Response.json({ error: 'No valid field provided' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 400 });
  }
});

export const meta: MetaFunction = () => {
  return [
    { title: 'System Settings - DTS' },
    { name: 'description', content: 'System settings.' },
  ];
};

export default function Settings() {
  const loaderData = useLoaderData<LoaderData>();
  const termsFetcher = useFetcher<{
    success?: boolean;
    updated?: InstanceSystemSettings;
    error?: string;
    field?: 'termsConditions';
  }>();
  const privacyFetcher = useFetcher<{
    success?: boolean;
    updated?: InstanceSystemSettings;
    error?: string;
    field?: 'privacyPolicy';
  }>();
  const termsDialogRef = useRef<HTMLDialogElement>(null);
  const privacyDialogRef = useRef<HTMLDialogElement>(null);
  const [termsConditionsUrl, setTermsConditionsUrl] = useState(
    loaderData.instanceSystemSettings?.footerUrlTermsConditions ?? 'Not set'
  );
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState(
    loaderData.instanceSystemSettings?.footerUrlPrivacyPolicy ?? 'Not set'
  );



  // Open dialogs
  const openTermsDialog = () => {
    termsDialogRef.current?.showModal();
  };
  const openPrivacyDialog = () => {
    privacyDialogRef.current?.showModal();
  };

  // Close dialogs
  const closeTermsDialog = () => {
    termsDialogRef.current?.close();
  };
  const closePrivacyDialog = () => {
    privacyDialogRef.current?.close();
  };

  // Update displayed values and close dialogs on successful save
  useEffect(() => {
    if (termsFetcher.data?.success && termsFetcher.state === 'idle' && termsFetcher.data.field === 'termsConditions') {
      setTermsConditionsUrl(termsFetcher.data.updated?.footerUrlTermsConditions ?? 'Not set');
      closeTermsDialog();
    }
  }, [termsFetcher.data, termsFetcher.state]);

  useEffect(() => {
    if (privacyFetcher.data?.success && privacyFetcher.state === 'idle' && privacyFetcher.data.field === 'privacyPolicy') {
      setPrivacyPolicyUrl(privacyFetcher.data.updated?.footerUrlPrivacyPolicy ?? 'Not set');
      closePrivacyDialog();
    }
  }, [privacyFetcher.data, privacyFetcher.state]);

  // Handle form submission states
  const isTermsSubmitting = termsFetcher.state === 'submitting';
  const isPrivacySubmitting = privacyFetcher.state === 'submitting';

  return (
    <MainContainer title="System Settings" headerExtra={<NavSettings />}>
      <div className="mg-section">
        <div className="mg-grid mg-grid__col-3 dts-form-component">
          <label className="dts-form-component__label">
            <strong>System language</strong>{' '}
            <select
              id="system-language"
              name="systemLanguage"
              className="dts-form-component__select"
            >
              <option disabled value="">
                Select from list
              </option>
              {loaderData.systemLanguage.map((item: string, index: number) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="dts-form-component__label">
            <strong>Currency</strong>{' '}
            <select
              id="currency"
              name="currency"
              className="dts-form-component__select"
            >
              <option disabled value="">
                Select from list
              </option>
              {loaderData.currencyArray.map((item: string, index: number) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ul style={{ paddingLeft: 20 }}>
          <li>
            <strong>Country instance:</strong>
            <ul>
              {loaderData.ctryInstanceName !== '' && (
                <li>
                  <strong>Country:</strong> {loaderData.ctryInstanceName}
                </li>
              )}
              <li>
                <strong>ISO 3:</strong> {loaderData.confCtryInstanceISO}
              </li>
              <li>
                <strong>Instance type:</strong>{' '}
                {loaderData.confInstanceTypePublic ? 'Public' : 'Private'}
              </li>
            </ul>
          </li>
          <li>
            <strong>DTS software application version:</strong> {' '}
            {loaderData.dtsSystemInfo?.appVersionNo ?? ''}
          </li>
          <li>
            <strong>System email routing configuration:</strong>
            <ul>
              <li>
                <strong>Transport:</strong> {loaderData.confEmailObj.EMAIL_TRANSPORT}
              </li>
              {loaderData.confEmailObj.EMAIL_TRANSPORT === 'smtp' && (
                <>
                  <li>
                    <strong>Host:</strong> {loaderData.confEmailObj.SMTP_HOST ?? 'Not set'}
                  </li>
                  <li>
                    <strong>Port:</strong> {loaderData.confEmailObj.SMTP_PORT ?? 'Not set'}
                  </li>
                  <li>
                    <strong>Secure:</strong>{' '}
                    {loaderData.confEmailObj.SMTP_SECURE ? 'Yes' : 'No'}
                  </li>
                </>
              )}
            </ul>
          </li>
          <li>
            <strong>Page Footer for Privacy Policy URL:</strong>{' '}
            {privacyPolicyUrl}{' '}
            <button
              type="button"
              className="mg-button mg-button--small mg-button-ghost"
              onClick={openPrivacyDialog}
              aria-label="Edit Privacy Policy URL"
            >
              <img
                alt="Edit"
                src="/assets/icons/edit.svg"
                style={{ width: '16px', height: '16px', verticalAlign: 'middle' }}
              />
            </button>
          </li>
          <li>
            <strong>Page Footer for Terms and Conditions URL:</strong>{' '}
            {termsConditionsUrl}{' '}
            <button
              type="button"
              className="mg-button mg-button--small mg-button-ghost"
              onClick={openTermsDialog}
              aria-label="Edit Terms and Conditions URL"
            >
              <img
                alt="Edit"
                src="/assets/icons/edit.svg"
                style={{ width: '16px', height: '16px', verticalAlign: 'middle' }}
              />
            </button>
          </li>
          <li>
            <strong>2FA/TOTP Issuer Name:</strong> {loaderData.conf2FAIssuer}
          </li>
          <li>
            <strong>System up to date</strong>
          </li>
        </ul>

        {/* Dialog for editing Terms and Conditions URL */}
        <dialog ref={termsDialogRef} className="dts-dialog">
          <div className="dts-dialog__content">
            <h2>Edit Terms and Conditions URL</h2>
            {termsFetcher.data?.error && <p style={{ color: 'red' }}>{termsFetcher.data.error}</p>}
            <termsFetcher.Form method="post" className="dts-form">
              <div className="dts-form-component">
                <label className="dts-form-component__label">
                  <div>Terms and Conditions URL:</div>
                  <input
                    type="url"
                    name="termsConditionsUrl"
                    defaultValue={loaderData.instanceSystemSettings?.footerUrlTermsConditions ?? ''}
                    placeholder="https://example.com/terms"
                    className="dts-form-component__input"
                    disabled={isTermsSubmitting}
                  />
                </label>
              </div>
              <div className="dts-form__actions">
                <button
                  type="button"
                  className="mg-button mg-button-outline"
                  onClick={closeTermsDialog}
                  disabled={isTermsSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mg-button mg-button-primary"
                  disabled={isTermsSubmitting}
                >
                  {isTermsSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </termsFetcher.Form>
          </div>
        </dialog>

        {/* Dialog for editing Privacy Policy URL */}
        <dialog ref={privacyDialogRef} className="dts-dialog">
          <div className="dts-dialog__content">
            <h2>Edit Privacy Policy URL</h2>
            {privacyFetcher.data?.error && <p style={{ color: 'red' }}>{privacyFetcher.data.error}</p>}
            <privacyFetcher.Form method="post" className="dts-form">
              <div className="dts-form-component">
                <label className="dts-form-component__label">
                  <div>Privacy Policy URL:</div>
                  <input
                    type="url"
                    name="privacyPolicyUrl"
                    defaultValue={loaderData.instanceSystemSettings?.footerUrlPrivacyPolicy ?? ''}
                    placeholder="https://example.com/privacy"
                    className="dts-form-component__input"
                    disabled={isPrivacySubmitting}
                  />
                </label>
              </div>
              <div className="dts-form__actions">
                <button
                  type="button"
                  className="mg-button mg-button-outline"
                  onClick={closePrivacyDialog}
                  disabled={isPrivacySubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mg-button mg-button-primary"
                  disabled={isPrivacySubmitting}
                >
                  {isPrivacySubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </privacyFetcher.Form>
          </div>
        </dialog>
      </div>
    </MainContainer>
  );
}