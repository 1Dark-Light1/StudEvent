/**
 * LoginScreen renders the authentication form that lets students access the app.
 * The component keeps the UX lightweight (gradient background + card) while handling
 * input validation, Firebase Auth login and feedback banners.
 */
import React, { useState, useEffect, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import Header from '../ui/Header';
import { auth } from '../../FireBaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useI18n } from '../../i18n/I18nContext';

// Cache images at module level to prevent reloading
const emailIcon = require('../../assets/email.png');
const lockIcon = require('../../assets/lock.png');
const closedEyesIcon = require('../../assets/closed-eyes.png');


export default function Login({ navigation }) {
	const { t } = useI18n();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [remember, setRemember] = useState(true);
	const [showPassword, setShowPassword] = useState(false);

	// Memoize icons to prevent re-creation on every render
	const emailIconElement = useMemo(
		() => <Image source={emailIcon} style={styles.inputImage} />,
		[]
	);
	const lockIconElement = useMemo(
		() => <Image source={lockIcon} style={styles.inputImage} />,
		[]
	);

	// Prefetch images on mount
	useEffect(() => {
		const prefetchImages = async () => {
			try {
				await Image.prefetch(Image.resolveAssetSource(emailIcon).uri);
				await Image.prefetch(Image.resolveAssetSource(lockIcon).uri);
				await Image.prefetch(Image.resolveAssetSource(closedEyesIcon).uri);
			} catch (e) {
				// Ignore prefetch errors
			}
		};
		prefetchImages();
	}, []);

	/**
	 * Attempts to authenticate the user with Firebase using the provided credentials.
	 * Shows early validation errors and gives contextual alerts after Firebase resolves.
	 */
	const handleLogin = async () => {
		if (!email || !password) {
			Alert.alert(t('auth.login.alert.title'), t('auth.login.alert.missing'));
			return;
		}

		try {
			await signInWithEmailAndPassword(auth, email.trim(), password);
			Alert.alert(t('auth.login.alert.successTitle'), t('auth.login.alert.successBody'), [
				{
					text: 'OK',
					onPress: () => navigation.navigate('Main'),
				},
			]);
		} catch (error) {
			console.log('Login error:', error);
			Alert.alert(
				t('auth.login.alert.errorTitle'),
				error.message || t('auth.login.alert.errorFallback')
			);
		}
	};

	return (
		<LinearGradient colors={["#BBCDE0", "#F7FCFE"]} style={styles.container}>
			<Header />

			<View style={styles.card}>
				<View style={styles.cardContent}>
					<Text style={styles.cardTitle}>{t('auth.login.title')}</Text>

					<IconInput
						icon={emailIconElement}
						placeholder={t('field.email')}
						keyboardType="email-address"
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
					/>

					<PasswordInput
						icon={lockIconElement}
						placeholder={t('field.password')}
						value={password}
						onChangeText={setPassword}
						showPassword={showPassword}
						onTogglePassword={() => setShowPassword(!showPassword)}
					/>

					<CheckboxRow
						checked={remember}
						onToggle={() => setRemember((v) => !v)}
						label={t('auth.login.remember')}
					/>

					<Pressable onPress={handleLogin} style={({ pressed }) => pressed && { opacity: 0.9 }}>
						<LinearGradient
							colors={['#2991FF', '#76B1F0']}
							style={styles.primaryBtn}
							start={{ x: 0, y: 0 }}
							end={{ x: 0, y: 1 }}
						>
							<Text style={styles.primaryText}>{t('auth.login.cta')}</Text>
						</LinearGradient>
					</Pressable>

					<Text style={styles.miniText}>
						{t('auth.login.noAccount')}{' '}
						<Text style={styles.link} onPress={() => navigation.navigate('Register')}>
							{t('auth.login.signup')}
						</Text>
					</Text>
				</View>

				<View style={styles.socialRow}>
					<SocialIcon bg="#FFFFFF" onPress={() => { }}>
						<FontAwesome name="google" size={22} color="#DB4437" />
					</SocialIcon>
					<SocialIcon bg="#FFFFFF" onPress={() => { }}>
						<FontAwesome name="facebook" size={22} color="#1877F2" />
					</SocialIcon>
					<SocialIcon bg="#FFFFFF" onPress={() => { }}>
						<FontAwesome name="apple" size={24} color="#111" />
					</SocialIcon>
				</View>
			</View>
		</LinearGradient>
	);
}

// Memoize closed eyes icon element to prevent recreation
const ClosedEyesIcon = memo(() => (
	<Image source={closedEyesIcon} style={styles.inputImage} />
));

/** Lightweight wrapper that pairs a left-aligned icon with a text input. */
const IconInput = memo(function IconInput({ icon, style, ...props }) {
	return (
		<View style={[styles.inputWrap, style]}>
			<View style={styles.inputIcon}>{icon}</View>
			<TextInput placeholderTextColor="#9AA7B8" style={styles.input} {...props} />
			<View style={styles.eyeIcon} />
		</View>
	);
});

/** Password input with eye icon toggle for show/hide password. */
const PasswordInput = memo(function PasswordInput({ icon, showPassword, onTogglePassword, style, ...props }) {
	return (
		<View style={[styles.inputWrap, style]}>
			<View style={styles.inputIcon}>{icon}</View>
			<TextInput
				placeholderTextColor="#9AA7B8"
				style={styles.input}
				secureTextEntry={!showPassword}
				{...props}
			/>
			<Pressable onPress={onTogglePassword} style={styles.eyeIcon}>
				<View style={{ position: 'relative', width: 20, height: 20 }}>
					<View style={{ position: 'absolute', opacity: showPassword ? 1 : 0 }}>
						<Ionicons name="eye" size={20} color="#8F8F8F" />
					</View>
					<View style={{ position: 'absolute', opacity: showPassword ? 0 : 1 }}>
						<ClosedEyesIcon />
					</View>
				</View>
			</Pressable>
		</View>
	);
});

/** Checkbox line used for remember-me like toggles. */
function CheckboxRow({ checked, onToggle, label }) {
	return (
		<Pressable style={styles.checkboxRow} onPress={onToggle} hitSlop={8}>
			<View style={[styles.checkbox, checked && styles.checkboxChecked]}>
				{checked && <Ionicons name="checkmark" size={14} color="#fff" />}
			</View>
			<Text style={styles.checkboxLabel}>{label}</Text>
		</Pressable>
	);
}

/** Circular icon button for potential federated login providers. */
function SocialIcon({ children, bg = '#fff', onPress }) {
	return (
		<Pressable style={({ pressed }) => [styles.socialBtn, { backgroundColor: bg }, pressed && { opacity: 0.9 }]} onPress={onPress}>
			{children}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 64,
		paddingHorizontal: 24,
		alignItems: 'center',
	},
	header: { marginBottom: 16 },
	card: {
		width: '100%',
		height: '100%',
		backgroundColor: '#F2F7FB',
		borderRadius: 25,
		paddingVertical: 23,
		paddingHorizontal: 30,
		marginTop: 18,
		flexDirection: 'column',
		justifyContent: 'space-between',
	},
	cardContent: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 22,
		fontWeight: '500',
		color: '#464646',
		textAlign: 'center',
		marginBottom: 15,
	},
	inputWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 14,
		paddingHorizontal: 10,
		paddingVertical: Platform.OS === 'ios' ? 12 : 8,
		marginVertical: 8,
		minHeight: Platform.OS === 'ios' ? 46 : 42,
		...shadow(10),
	},
	inputIcon: {
		width: 24,
		alignItems: 'center',
		marginRight: 8,
		marginLeft: 5,
	},
	inputImage: {
		width: 20,
		height: 20,
		resizeMode: 'contain',
	},
	eyeIcon: {
		padding: 0,
		marginRight: 5,
		justifyContent: 'center',
		alignItems: 'center',
		width: 30,
		height: 30,
	},
	input: {
		flex: 1,
		fontSize: 16,
		fontWeight: '500',
		color: '#000000',
	},
	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 12,
		marginBottom: 12,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#464646',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	checkboxChecked: {
		backgroundColor: '#464646',
		borderColor: '#464646',
	},
	checkboxLabel: {
		marginLeft: 8,
		fontWeight: '400',
		color: '#3D4C66',
	},
	primaryBtn: {
		marginTop: 6,
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		...shadow(10),
	},
	primaryText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 18,
	},
	miniText: {
		marginTop: 14,
		fontWeight: '400',
		textAlign: 'center',
		color: '#7A8BA3',
	},
	link: {
		color: '#2F7BFF',
		fontWeight: '600',
	},
	socialRow: {
		flexDirection: 'row',
		gap: 28,
		justifyContent: 'center',
		marginBottom: 390,
	},
	socialBtn: {
		width: 52,
		height: 52,
		borderRadius: 26,
		alignItems: 'center',
		justifyContent: 'center',
	},
});

/** Normalizes platform shadows so the UI feels consistent on iOS and Android. */
function shadow(elev = 8) {
	return Platform.select({
		ios: {
			shadowColor: '#000',
			shadowOpacity: 0.08,
			shadowRadius: elev / 2,
			shadowOffset: { width: 0, height: Math.ceil(elev / 3) },
		},
		android: {
			elevation: elev,
		},
		default: {},
	});
}
