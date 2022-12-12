import { useLoaderData, useSubmit, useTransition } from '@remix-run/react';
import { json } from '@remix-run/node';
import type { ActionFunction, LinksFunction, LoaderFunction } from '@remix-run/node';
import { getAuth } from '@clerk/remix/ssr.server';
import { users } from '@clerk/remix/api.server';
import type { User } from '@clerk/remix/api.server';
import { RoleSelect, DocsLink, Card, CerbosPolicy, APIRequest, GuardedRoutes } from '~/components';
import { useClerk } from '@clerk/clerk-react';
import { getGetResourcesSource, getPolicySource } from '~/utils/source-loader.server';

import indexStylesheetUrl from '~/styles/index.css';

interface LoaderData {
  user: User;
  policySource: Record<string, string>;
  getResourcesSource: string;
}

export const loader: LoaderFunction = async (loaderArgs) => {
  const policySource = await getPolicySource();
  const getResourcesSource = await getGetResourcesSource();

  const auth = await getAuth(loaderArgs);
  const user = await (auth.userId ? users.getUser(auth.userId) : null);

  return json({
    user,
    policySource,
    getResourcesSource,
  });
};

export const action: ActionFunction = async (actionArgs) => {
  const auth = await getAuth(actionArgs);
  if (!auth.userId) {
    return null;
  }

  const formData = await actionArgs.request.formData();
  const role = formData.get('role') as string;

  await users.updateUser(auth.userId, {
    publicMetadata: { role },
  });
  return null;
};

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: indexStylesheetUrl }];
};

export default function Index() {
  const { user, policySource, getResourcesSource } = useLoaderData() as LoaderData;
  const role = user?.publicMetadata?.role as string | undefined;
  const clerk = useClerk();

  const submit = useSubmit();
  const transition = useTransition();

  return (
    <>
      <h1>Remix App: Cerbos + Clerk Demo</h1>
      <p className="description">
        Example Remix app using Clerk for authentication and Cerbos for authorization.
      </p>

      {user ? (
        <>
          <section className="role-selection">
            <RoleSelect
              role={role}
              onRoleChange={(event) => submit(event.currentTarget.form, { replace: true })}
              loading={transition.state !== 'idle'}
            />
          </section>

          <div className="example-links">
            <Card
              href="#resource-access"
              title="Resource Access Demo"
              disabled={!role}
              icon={<img slot="icon" src="/icons/server.svg" alt="" />}
            />
            <Card
              href="#route-guard"
              title="Route Guard Demo"
              disabled={!role}
              icon={<img slot="icon" src="/icons/lock.svg" alt="" />}
            />
          </div>
        </>
      ) : (
        <section className="login">
          <Card
            title="Log in/Sign up for an account"
            href="/sign-up"
            loading={!clerk}
            icon={<img slot="icon" src="/icons/user-plus.svg" alt="" />}
            action={<img slot="action" src="/icons/arrow-right.svg" alt="" />}
          >
            <p>
              Login to your account or sign up for a new account maanged by Clerk.dev. This will
              provide your identity which will be used by Cerbos for authorization.
            </p>
          </Card>
        </section>
      )}

      {user ? (
        <>
          <section className="cerbos-policy-example">
            <CerbosPolicy policySource={policySource} />
          </section>

          <section id="resource-access" className="demo-resource-authorization">
            <APIRequest user={user} role={role} getResourcesSource={getResourcesSource} />
          </section>

          <section id="route-guard" className="demo-route-guards">
            <GuardedRoutes disabled={!role} />
          </section>

          <section className="user-profile">
            <h2>Clerk - User Profile</h2>
            <Card
              title="Manage your Clerk user profile"
              icon={<img slot="icon" src="/icons/layout.svg" alt="" />}
              action={<img slot="action" src="/icons/arrow-right.svg" alt="" />}
              onClick={(ev) => {
                ev.preventDefault();
                clerk.openUserProfile({});
              }}
            >
              <p>
                Interact with the user button, user profile, and more to preview what your users
                will see
              </p>
            </Card>
          </section>
        </>
      ) : null}

      <div className="links">
        <DocsLink href="https://docs.clerk.dev?utm_source=github&utm_medium=starter_repos&utm_campaign=remix_starter">
          Read Clerk documentation
        </DocsLink>
        <DocsLink href="https://docs.cerbos.dev">Read Cerbos documentation</DocsLink>
        <DocsLink href="https://remix.run/docs">Read Remix documentation</DocsLink>
      </div>
    </>
  );
}
