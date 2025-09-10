import { Amplify } from '@aws-amplify/core';

import { environment } from '../environments/environment';

export function configureAmplify(): void {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: environment.cognito.userPoolId,
        userPoolClientId: environment.cognito.userPoolWebClientId,
        loginWith: {
          oauth: {
            domain: environment.cognito.domain,
            scopes: environment.cognito.scopes,
            redirectSignIn: [environment.cognito.redirectSignIn],
            redirectSignOut: [environment.cognito.redirectSignOut],
            responseType: 'code',
          },
        },
      },
    },
  });
}
