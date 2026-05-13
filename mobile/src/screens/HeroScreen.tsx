import React from 'react';
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Hero'>;

const { width } = Dimensions.get('window');

const features = [
  {
    icon: '🔒',
    title: 'End-to-End Encrypted',
    desc: 'Messages encrypted on your device with NaCl Box. Only you and the recipient can read them.',
    accent: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.2)',
  },
  {
    icon: '👥',
    title: 'Friends Only',
    desc: 'Only accepted friends can message each other. Your space, your rules.',
    accent: '#d4d4d8',
    bg: 'rgba(113, 113, 122, 0.08)',
    border: 'rgba(113, 113, 122, 0.2)',
  },
  {
    icon: '🛡️',
    title: 'Zero Knowledge',
    desc: 'The server stores only encrypted data. We cannot read your messages even if we wanted to.',
    accent: '#f87171',
    bg: 'rgba(248, 113, 113, 0.08)',
    border: 'rgba(248, 113, 113, 0.2)',
  },
];

export function HeroScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Nav Bar */}
        <View style={s.nav}>
          <View style={s.navBrand}>
            <View style={s.navIcon}>
              <Text style={s.navIconText}>◎</Text>
            </View>
            <Text style={s.navTitle}>
              End<Text style={s.navAccent}>To</Text>End
            </Text>
          </View>
          <View style={s.navActions}>
            <Pressable onPress={() => navigation.navigate('Login')} style={s.navLoginBtn}>
              <Text style={s.navLoginText}>Login</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Register')} style={s.navSignupBtn}>
              <Text style={s.navSignupText}>Sign Up</Text>
            </Pressable>
          </View>
        </View>

        {/* Hero Globe */}
        <View style={s.globeWrap}>
          <View style={s.globeGlow} />
          <View style={s.globe}>
            <Text style={s.globeIcon}>🌐</Text>
            <View style={s.globeLock}>
              <Text style={s.globeLockIcon}>🔒</Text>
            </View>
          </View>
        </View>

        {/* Headline */}
        <Text style={s.headline}>
          Private.{' '}
          <Text style={s.headlineAccent}>Encrypted.</Text>
          {'\n'}Friends Only.
        </Text>

        {/* Sub-headline */}
        <Text style={s.subheadline}>
          EndToEnd uses end-to-end encryption so only you and your friends can read your messages.
          The server never sees your plaintext — not even us.
        </Text>

        {/* CTAs */}
        <View style={s.ctas}>
          <Pressable style={s.ctaPrimary} onPress={() => navigation.navigate('Register')}>
            <Text style={s.ctaPrimaryText}>Get Started Free</Text>
          </Pressable>
          <Pressable style={s.ctaSecondary} onPress={() => navigation.navigate('Login')}>
            <Text style={s.ctaSecondaryText}>Sign In</Text>
          </Pressable>
        </View>

        {/* Feature cards */}
        <View style={s.features}>
          {features.map(({ icon, title, desc, bg, border }) => (
            <View key={title} style={[s.featureCard, { backgroundColor: bg, borderColor: border }]}>
              <View style={[s.featureIconWrap, { backgroundColor: bg, borderColor: border }]}>
                <Text style={s.featureIcon}>{icon}</Text>
              </View>
              <Text style={s.featureTitle}>{title}</Text>
              <Text style={s.featureDesc}>{desc}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>🔒 EndToEnd · End-to-end encrypted · Zero knowledge</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: 40 },

  // Nav
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconText: { color: '#000', fontSize: 18, fontWeight: '900' },
  navTitle: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  navAccent: { color: '#ef4444' },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navLoginBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  navLoginText: { color: '#a1a1aa', fontWeight: '600', fontSize: 13 },
  navSignupBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  navSignupText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Globe
  globeWrap: { alignItems: 'center', marginTop: 40, marginBottom: 24 },
  globeGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
  },
  globe: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#b91c1c',
  },
  globeIcon: { fontSize: 50 },
  globeLock: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  globeLockIcon: { fontSize: 14 },

  // Headline
  headline: {
    textAlign: 'center',
    fontSize: width > 400 ? 40 : 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    lineHeight: width > 400 ? 48 : 42,
    paddingHorizontal: 20,
  },
  headlineAccent: { color: '#ef4444' },

  // Sub
  subheadline: {
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 22,
  },

  // CTAs
  ctas: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 28,
    paddingHorizontal: 20,
  },
  ctaPrimary: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  ctaPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  ctaSecondary: {
    borderWidth: 2,
    borderColor: '#3f3f46',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  ctaSecondaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Features
  features: { marginTop: 48, paddingHorizontal: 16, gap: 12 },
  featureCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: { fontSize: 18 },
  featureTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  featureDesc: { color: '#71717a', fontSize: 12, lineHeight: 18 },

  // Footer
  footer: {
    marginTop: 40,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#18181b',
    alignItems: 'center',
  },
  footerText: { color: '#3f3f46', fontSize: 11 },
});
