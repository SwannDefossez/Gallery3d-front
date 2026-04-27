<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Lancer et deployer Gallerie3d

Ce projet contient tout ce dont vous avez besoin pour lancer l'application en local.

Nom de l'application: Gallerie3d

## Lancer en local

**Prerequis:** Node.js


1. Installer les dependances:
   `npm install`
2. Verifier les variables dans `.env`
3. Initialiser la base:
   `npm run db:push`
4. Seeder la base:
   `npm run db:seed`
5. Lancer client + API:
   <!-- `npm run dev` -->

## Comptes seedes

- Moderator: `moderator@gallery3d.local` / `moderator123`
- Collector: `collector@gallery3d.local` / `collector123`
- Artistes seedes: mot de passe `artist123`

## Achat simule

Le projet utilise maintenant une simulation complete de l achat.

- pas de configuration Stripe requise
- le checkout cree une commande locale
- le stock reserve est converti en stock vendu
- l historique des commandes est visible dans `/account`
