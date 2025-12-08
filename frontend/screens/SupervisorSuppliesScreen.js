import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

const SupervisorSuppliesScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { site } = route.params || {};

    if (!site) {
        return (
            <View style={styles.center}>
                <Text>No Site Information Provided</Text>
            </View>
        );
    }

    const menuItems = [
        {
            title: 'Request Supplies',
            subtitle: 'Request items from warehouse',
            icon: 'paper-plane-outline',
            color: '#17a2b8',
            target: 'CreateSupplyRequest',
            params: { site }
        },
        {
            title: 'Request Status',
            subtitle: 'Check pending, approved, rejected requests',
            icon: 'time-outline',
            color: '#ffc107',
            target: 'SupplyRequestStatus',
            params: { site }
        },
        {
            title: 'Manage Stock',
            subtitle: 'View and edit current site inventory',
            icon: 'cube-outline',
            color: '#007bff',
            target: 'ManageSupplies',
            params: { site, canEdit: true }
        }
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <Text style={styles.title}>Supplies Hub</Text>
                            <Text style={styles.subtitle}>{site.siteName}</Text>
                        </View>
                    </View>

                    <View style={styles.contentArea}>
                        <ScrollView contentContainerStyle={styles.menuContainer}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.menuCard}
                                    onPress={() => navigation.navigate(item.target, item.params)}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                                        <Ionicons name={item.icon} size={32} color={item.color} />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.menuTitle}>{item.title}</Text>
                                        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 30,
    },
    backButton: {
        marginRight: 15,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 20
    },
    headerContent: { flex: 1 },
    title: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 30,
        paddingHorizontal: 20
    },
    menuContainer: {
        paddingBottom: 20
    },
    menuCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    iconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20
    },
    textContainer: { flex: 1 },
    menuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4
    },
    menuSubtitle: {
        fontSize: 13,
        color: '#666'
    }
});

export default SupervisorSuppliesScreen;
