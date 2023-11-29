import * as helpers from '$lib/server/helpers';
import * as settings from '$lib/server/settings';
import type { Issuer, ModalTheme } from '$lib/types';
import { PlexOauth } from 'plex-oauth'
import { v4 as uuidv4 } from 'uuid';
import { redirect } from '@sveltejs/kit';
import * as Plex from '$lib/server/plex';
import prisma from '$lib/server/prisma';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {

  let plexOauth = new PlexOauth(Plex.types.CLIENT_INFORMATION);
  const pinId = params.pinId;

  const debug = await settings.get('system.debug');
  
  // Check for the auth token, once returning to the application
  let success = false;
  let tested = false;
  try {
    const authToken = await plexOauth.checkForAuthToken(parseInt(pinId))
    if (authToken !== null) {
      if (debug) console.log('Setting Auth Token');
      await settings.set('plex.token', await helpers.encrypt(authToken));
      if (debug) console.log('token', await helpers.decrypt(await settings.get('plex.token')));
      success = true;
      const results = await Plex.testPlexConnection(await settings.get('plex.address'), await helpers.decrypt(await settings.get('plex.token')));
      console.log(results);
      if (results.success) {
        await settings.set('plex.enable', true);
        tested = true;
      }
    }
  } catch(e) {
    console.log('error', e);
  }

  if (success) {
    if (tested) {
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          issuer: 'account.sync' satisfies Issuer,
          theme: 'ok' satisfies ModalTheme,
          text: 'Successfully added Plex Account',
          sub_text: 'An auth token has been successfully generated and Plex is fully enabled.',
          linger_time: 6000,
          needs_clearing: false,
          auto_open: true
        }
      });
    } else {
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          issuer: 'general' satisfies Issuer,
          theme: 'warning' satisfies ModalTheme,
          text: 'Successfully added Plex Account',
          sub_text: 'An auth token has been successfully generated but Plex is not fully enabled.',
          linger_time: 6000,
          needs_clearing: false,
          auto_open: true
        }
      });
    }
  } else {
    await prisma.notification.create({
      data: {
        id: uuidv4(),
        issuer: 'general' satisfies Issuer,
        theme: 'error' satisfies ModalTheme,
        text: 'Successfully added Plex Account',
        sub_text: 'An auth token was not generated.',
        linger_time: 6000,
        needs_clearing: false,
        auto_open: true
      }
    });
  }

  throw redirect(303, '../');
}